/** One message lp-task saved or copied: its files. */
export type Copy = {
  key: string
  kind: string
  html: string
  txt: string
}

declare module 'claude-code' {
  interface PluginState {
    'lp-copy-bar': { copies: Shaped<Copy[]> }
  }
}
