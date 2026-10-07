"use client"

import { useSyncExternalStore } from "react"

const noop = () => () => {}

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

function readModKey() {
  return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"
}

/** The platform's command modifier, as shown in shortcut hints. */
export function useModKey(): string {
  return useSyncExternalStore(noop, readModKey, () => "Ctrl")
}
