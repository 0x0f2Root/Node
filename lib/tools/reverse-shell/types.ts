// The reverse-shell generator's data model. A shell is metadata plus a pure
// `template(config)` that returns the command string. Nothing here touches
// the DOM, the network, or a process: it only ever produces text.

export type ReverseShellPlatform = "linux" | "windows" | "cross-platform"

export interface ReverseShellConfig {
  /** Listener address: IPv4, IPv6 or hostname, as the user typed it. */
  host: string
  /** Listener port, as a string so an in-progress value stays editable. */
  port: string
}

export interface ReverseShell {
  id: string
  name: string
  description: string
  /** highlight.js language id for the generated command */
  language: string
  platform: ReverseShellPlatform
  /** A short grouping label shown on the card, e.g. "Unix" or "Windows". */
  category: string
  /** Words the filters and search match against, besides the fields above. */
  tags: readonly string[]
  /** Builds the command for the given listener. Pure. */
  template: (config: ReverseShellConfig) => string
}
