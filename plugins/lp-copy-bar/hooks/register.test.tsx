import { expect, test } from 'claude-code/testing'

import { parseCopy, parseMessageFile } from './register'

const BAND = {
  plugin: 'lp-copy-bar',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const

const COMMAND =
  'osascript -l JavaScript "/plugins/lp-task/scripts/copy-rich.js" "/state/ACME-1/messages/how-to-test.html" "/state/ACME-1/messages/how-to-test.txt"'

test('parses the lp-task copy call', () => {
  expect(parseCopy(COMMAND)).toEqual({
    key: 'ACME-1',
    kind: 'how-to-test',
    html: '/state/ACME-1/messages/how-to-test.html',
    txt: '/state/ACME-1/messages/how-to-test.txt',
  })
  expect(parseCopy('osascript -l JavaScript other.js a.html b.txt')).toBe(null)
  expect(parseCopy('git status')).toBe(null)
})

test('parses a saved message file', () => {
  const copy = { key: 'ACME-1', kind: 'mr', html: '/state/ACME-1/messages/mr.html', txt: '/state/ACME-1/messages/mr.txt' }
  expect(parseMessageFile('/state/ACME-1/messages/mr.html')).toEqual(copy)
  expect(parseMessageFile('/state/ACME-1/messages/mr.txt')).toEqual(copy)
  expect(parseMessageFile('/state/ACME-1/notes/mr.html')).toBe(null)
  expect(parseMessageFile('/src/index.html')).toBe(null)
})

test('a saved message without a copy puts a button above the prompt', async ($, on) => {
  const ran: string[][] = []
  on('tool.call', () => ({ result: {} }))
  on('process.run', (_, e) => {
    ran.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', () => ({ value: undefined }))

  await $.tool.call({ tool: 'Write', file_path: '/state/ACME-2/messages/mr.html', content: '<b>MR</b>' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Button', key: 'copy:ACME-2:mr' }))?.props.label).toBe('MR')
  await ui.press({ key: 'copy:ACME-2:mr' })
  expect(ran.at(-1)?.slice(-2)).toEqual(['/state/ACME-2/messages/mr.html', '/state/ACME-2/messages/mr.txt'])
  await ui.unmount()
})

test('a copy call puts a button above the prompt, and the button copies again', async ($, on) => {
  const ran: string[][] = []
  on('tool.call', () => ({ result: {} }))
  on('process.run', (_, e) => {
    ran.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', () => ({ value: undefined }))

  await $.tool.call({ tool: 'Bash', command: COMMAND })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const button = await ui.find({ type: 'Button', key: 'copy:ACME-1:how-to-test' })
  expect(button?.props.label).toBe('Сообщение для QA')
  expect(await ui.find({ type: 'Button', key: 'hide' })).toBeFalsy()

  await ui.press({ key: 'copy:ACME-1:how-to-test' })
  const argv = ran.at(-1) ?? []
  expect(argv.slice(0, 4)).toEqual(['osascript', '-l', 'JavaScript', '-e'])
  expect(argv.slice(-2)).toEqual(['/state/ACME-1/messages/how-to-test.html', '/state/ACME-1/messages/how-to-test.txt'])
  await ui.unmount()
})

test('nothing is drawn before any copy', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
