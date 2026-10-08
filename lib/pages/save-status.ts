"use client"

import { useSyncExternalStore } from "react"

import { toast } from "sonner"

import { PageConflictError, reloadPage, updatePage } from "@/lib/pages/store"
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
  input: UpdatePageInput,
  options: { force?: boolean } = {}
): Promise<boolean> {
  store.set("saving")
  try {
    await updatePage(id, input, options)
    retry = null
    store.set(dirty ? "unsaved" : "saved")
    return true
  } catch (error) {
    retry = () => void savePage(id, input, options)
    store.set("error")
    if (error instanceof PageConflictError) {
      // The file was edited elsewhere. Neither version is discarded until
      // the user picks one.
      toast.error("This page changed on disk", {
        id: "page-conflict",
        description:
          "It was edited outside Node while you were working on it here.",
        duration: Infinity,
        action: {
          label: "Keep my version",
          onClick: () => void savePage(id, input, { force: true }),
        },
        cancel: {
          label: "Load from disk",
          onClick: () => {
            resetSaveState()
            reloadPage(id)
          },
        },
      })
    }
    return false
  }
}
