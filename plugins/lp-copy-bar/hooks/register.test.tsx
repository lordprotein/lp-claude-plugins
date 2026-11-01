import { expect, test } from 'claude-code/testing'

import { parseCopy } from './register'

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
    script: '/plugins/lp-task/scripts/copy-rich.js',
  })
  expect(parseCopy('osascript -l JavaScript other.js a.html b.txt')).toBe(null)
  expect(parseCopy('git status')).toBe(null)
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
  expect(button?.props.label).toBe('Тестерам')

  await ui.press({ key: 'copy:ACME-1:how-to-test' })
  expect(ran.at(-1)).toEqual([
    'osascript',
    '-l',
    'JavaScript',
    '/plugins/lp-task/scripts/copy-rich.js',
    '/state/ACME-1/messages/how-to-test.html',
    '/state/ACME-1/messages/how-to-test.txt',
  ])
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
