import { SHELLS } from "@/lib/tools/reverse-shell/catalog"
import type { ReverseShell } from "@/lib/tools/reverse-shell/types"

// Filtering and validation for the reverse-shell generator. Pure functions
// over the catalog and the typed-in listener values; no side effects.

export interface ShellFilter {
  id: string
  label: string
  match: (shell: ReverseShell) => boolean
}

function hasTag(shell: ReverseShell, tag: string): boolean {
  return shell.tags.includes(tag)
}

// A small, fixed set of filters, built from the catalog's own metadata so a
// new shell joins the right ones automatically.
export const FILTERS: readonly ShellFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "linux", label: "Linux", match: (shell) => shell.platform === "linux" },
  {
    id: "windows",
    label: "Windows",
    match: (shell) => shell.platform === "windows",
  },
  { id: "bash", label: "Bash", match: (shell) => hasTag(shell, "bash") },
  { id: "python", label: "Python", match: (shell) => hasTag(shell, "python") },
  { id: "php", label: "PHP", match: (shell) => hasTag(shell, "php") },
  { id: "netcat", label: "Netcat", match: (shell) => hasTag(shell, "netcat") },
  {
    id: "powershell",
    label: "PowerShell",
    match: (shell) => hasTag(shell, "powershell"),
  },
  {
    id: "other",
    label: "Other",
    match: (shell) => shell.category === "Other",
  },
]

export function getFilter(id: string): ShellFilter {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0]
}

/** How many shells each filter would show, for the chip counts. */
export function filterCounts(): Record<string, number> {
  return Object.fromEntries(
    FILTERS.map((filter) => [filter.id, SHELLS.filter(filter.match).length])
  )
}

/** The shells matching the active filter and the search text. */
export function filterShells(
  filterId: string,
  query: string
): readonly ReverseShell[] {
  const filter = getFilter(filterId)
  const needle = query.trim().toLowerCase()
  return SHELLS.filter((shell) => {
    if (!filter.match(shell)) {
      return false
    }
    if (!needle) {
      return true
    }
    const haystack = [
      shell.name,
      shell.description,
      shell.language,
      shell.platform,
      shell.category,
      ...shell.tags,
    ]
      .join(" ")
      .toLowerCase()
    return needle.split(/\s+/).every((term) => haystack.includes(term))
  })
}

export interface FieldState {
  valid: boolean
  error?: string
  hint?: string
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
// Loose IPv6: hex groups and colons, optionally bracketed or zone-suffixed.
const IPV6 = /^\[?[0-9a-fA-F:]+(%[0-9a-zA-Z]+)?\]?$/
// A hostname label set: letters, digits and hyphens, dot-separated.
const HOSTNAME =
  /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/** Validates LHOST. Empty is allowed (treated as "not filled in yet"). */
export function validateHost(value: string): FieldState {
  const host = value.trim()
  if (!host) {
    return {
      valid: false,
      hint: "Enter a listener address to complete the commands.",
    }
  }
  if (
    IPV4.test(host) ||
    HOSTNAME.test(host) ||
    (host.includes(":") && IPV6.test(host))
  ) {
    return { valid: true }
  }
  return {
    valid: false,
    error: "That does not look like an IP address or hostname.",
  }
}

/** Validates LPORT. Empty is allowed; an out-of-range number is an error. */
export function validatePort(value: string): FieldState {
  const port = value.trim()
  if (!port) {
    return { valid: false, hint: "Enter a listener port." }
  }
  if (!/^\d+$/.test(port)) {
    return { valid: false, error: "Port must be a number." }
  }
  const number = Number(port)
  if (number < 1 || number > 65535) {
    return { valid: false, error: "Port must be between 1 and 65535." }
  }
  return { valid: true }
}
