/** One message lp-task copied: its files and the script that copied it. */
export type Copy = {
  key: string
  kind: string
  html: string
  txt: string
  script: string
}

declare module 'claude-code' {
  interface PluginState {
    'lp-copy-bar': { copies: Shaped<Copy[]>; isHidden: boolean }
  }
}
