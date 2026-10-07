"use client"

import { useSyncExternalStore } from "react"

import { updatePage } from "@/lib/pages/store"
import type { UpdatePageInput } from "@/lib/pages/types"
import { createStore } from "@/lib/utils/store"

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error"

const store = createStore<SaveState>("idle")

// Edits waiting on the debounce. Kept outside the state so a save that
// finishes while more typing is pending reports "unsaved", not "saved".
let dirty = false
let retry: (() => void) | null = null

export function useSaveState(): SaveState {
  return useSyncExternalStore(store.subscribe, store.get, () => "idle")
}

export function resetSaveState() {
  dirty = false
  retry = null
  store.set("idle")
}

export function markUnsaved() {
  dirty = true
  if (store.get() !== "saving") {
    store.set("unsaved")
  }
}

export function clearUnsaved() {
  dirty = false
}

export function retrySave() {
  retry?.()
}

/** Persists a change to a page and reflects the outcome in the topbar. */
export async function savePage(
  id: string,
  input: UpdatePageInput
): Promise<boolean> {
  store.set("saving")
  try {
    await updatePage(id, input)
    retry = null
    store.set(dirty ? "unsaved" : "saved")
    return true
  } catch {
    retry = () => void savePage(id, input)
    store.set("error")
    return false
  }
}
