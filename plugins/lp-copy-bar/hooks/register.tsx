import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Copy } from '../types'

// Change the tag when the fields of Copy change: it declines what an earlier version stored.
const copies = atom({ plugin: 'lp-copy-bar', key: 'copies' } as const, [], { shape: 'copies-2' })

const STORE_KEY = 'recent'
const MAX_KEPT = 8
const LABELS: Record<string, string> = { mr: 'MR', 'how-to-test': 'Сообщение для QA' }

const ARG = String.raw`(?:"([^"]+)"|'([^']+)'|(\S+))`
const COPY_CALL = new RegExp(String.raw`osascript\s+-l\s+JavaScript\s+${ARG}\s+${ARG}\s+${ARG}`)

const MESSAGE_FILE = /^(.*\/([^/]+)\/messages\/([\w-]+))\.(html|txt)$/

/** A saved lp-task message file `<stateDir>/<key>/messages/<kind>.html` or `.txt`. */
export const parseMessageFile = (path: string): Copy | null => {
  const m = MESSAGE_FILE.exec(path)
  if (!m) return null
  return { key: m[2] ?? '', kind: m[3] ?? '', html: `${m[1]}.html`, txt: `${m[1]}.txt` }
}

/** The lp-task copy call in a Bash command: `osascript -l JavaScript <copy-rich.js> <…/<key>/messages/<kind>.html> <….txt>`. */
export const parseCopy = (command: string): Copy | null => {
  const m = COPY_CALL.exec(command)
  if (!m) return null
  const pick = (i: number) => m[i] ?? m[i + 1] ?? m[i + 2] ?? ''
  const script = pick(1)
  const html = pick(4)
  const txt = pick(7)
  if (!script.endsWith('copy-rich.js') || !txt.endsWith('.txt') || !html.endsWith('.html')) return null
  return parseMessageFile(html)
}

// Puts the HTML and the plain text on the macOS pasteboard (the same as lp-task's copy-rich.js, so no lp-task path is needed).
const COPY_RICH = [
  "ObjC.import('AppKit')",
  'function run(argv) {',
  '  const read = p => $.NSString.stringWithContentsOfFileEncodingError($(p), $.NSUTF8StringEncoding, null)',
  '  const html = read(argv[0]), text = read(argv[1])',
  "  if (!html || html.isNil() || !text || text.isNil()) throw new Error('cannot read the message files')",
  '  const pb = $.NSPasteboard.generalPasteboard',
  '  pb.clearContents',
  "  pb.setStringForType(html, 'public.html')",
  "  pb.setStringForType(text, 'public.utf8-plain-text')",
  "  return 'copied'",
  '}',
].join('\n')

/** Button label: a known kind, `mr-<group>` as «MR <group>» (one MR message per group), otherwise the raw name. */
export const label = (kind: string): string => {
  const known = LABELS[kind]
  if (known) return known
  const group = /^mr-(.+)$/.exec(kind)?.[1]
  return group ? `MR ${group.replaceAll('-', ' ')}` : kind
}

const remember = (list: readonly Copy[], copy: Copy): Copy[] =>
  [...list.filter(c => !(c.key === copy.key && c.kind === copy.kind)), copy].slice(-MAX_KEPT)

/** Copies with formatting; plain text through the terminal if that fails. */
const copyAgain = async ($: EngineInterface, copy: Copy, surface?: Parameters<EngineInterface['ui']['copy']>[0]['surface']) => {
  try {
    const ran = await $.process.run(['osascript', '-l', 'JavaScript', '-e', COPY_RICH, copy.html, copy.txt])
    if (ran.exitCode === 0) {
      $.ui.toast(`${copy.key}: «${label(copy.kind)}» скопировано`)
      return true
    }
  } catch {
    // falls through to the plain text copy
  }
  try {
    const text = await $.fs.read(copy.txt)
    const done = await $.ui.copy(surface ? { text, surface } : { text })
    $.ui.toast(done.isCopied ? `${copy.key}: «${label(copy.kind)}» скопировано без форматирования` : `${copy.key}: не удалось скопировать`)
    return done.isCopied
  } catch {
    $.ui.toast(`${copy.key}: файл сообщения не найден`)
    return false
  }
}

/**
 * The other messages of the same task already saved in its `messages/` folder (an earlier session, or a message
 * written before the plugin reloaded), oldest first: a kind counts when both its `.html` and `.txt` are there.
 */
const savedSiblings = async ($: EngineInterface, copy: Copy): Promise<Copy[]> => {
  const dir = copy.html.slice(0, copy.html.lastIndexOf('/'))
  try {
    const entries = await $.fs.list(dir)
    const files = new Map(entries.filter(f => f.kind === 'file').map(f => [f.name, f.mtimeMs]))
    return [...files.keys()]
      .filter(name => name.endsWith('.html') && files.has(`${name.slice(0, -5)}.txt`))
      .sort((a, b) => (files.get(a) ?? 0) - (files.get(b) ?? 0))
      .map(name => parseMessageFile(`${dir}/${name}`))
      .filter((c): c is Copy => c !== null && c.kind !== copy.kind)
  } catch {
    return []
  }
}

/** Remembers a message for the buttons (this session, with the task's other saved messages) and for /copy-last (across sessions). */
const keep = async ($: EngineInterface, copy: Copy) => {
  const siblings = await savedSiblings($, copy)
  await update($, copies, list => {
    const known = siblings.filter(s => !list.some(c => c.key === s.key && c.kind === s.kind))
    return remember([...list, ...known], copy)
  })
  const kept = await $.store.get(STORE_KEY)
  await $.store.set(STORE_KEY, remember(Array.isArray(kept) ? (kept as Copy[]) : [], copy))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'copy-last',
      description: 'Copy the last lp-task message (MR or tester message) again, with formatting',
    })
    return next(e)
  })

  // lp-task copied a message.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const copy = parseCopy(e.command)
    if (copy && ran.deny === undefined && ran.isError !== true) await keep($, copy)
    return ran
  }).catch(($, e, next) => next(e))

  // lp-task saved a message without copying it: the button is the way to copy it.
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    const copy = parseMessageFile(e.file_path)
    if (copy && ran.deny === undefined && ran.isError !== true) await keep($, copy)
    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'copy-last' }, async $ => {
    const session = await read($, copies)
    const kept = await $.store.get(STORE_KEY)
    const last = session.at(-1) ?? (Array.isArray(kept) ? (kept as Copy[]).at(-1) : undefined)
    if (!last) return { text: 'Сообщений lp-task для копирования пока нет.' }
    const ok = await copyAgain($, last)
    return { text: ok ? `Скопировано: ${last.key}, «${label(last.kind)}».` : `Не удалось скопировать ${last.key}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, copies)
    if (e.props.hasSurvey || list.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const keys = [...new Set(list.map(c => c.key))].slice(-2)

    return (
      <Box flexDirection="column">
        {keys.map(key => (
          <Box>
            <Text dimColor>📋 {key}: </Text>
            {list
              .filter(c => c.key === key)
              .map(c => (
                <Button
                  key={`copy:${c.key}:${c.kind}`}
                  label={label(c.kind)}
                  onPress={press => void copyAgain($, c, press.surface)}
                />
              ))}
          </Box>
        ))}
      </Box>
    )
  })
}
