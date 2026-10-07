"use client"

import { useSyncExternalStore } from "react"

import { createStore } from "@/lib/utils/store"

// Transient UI state for the page tree: which row is being named in place,
// and whether the workspace dialog is open. Nothing here is persisted.
interface TreeUI {
  /** The row showing a name field. `creating` rows are deleted on Escape. */
  editing: { id: string; creating: boolean } | null
  workspaceDialog: { mode: "create" } | { mode: "edit"; id: string } | null
}

const INITIAL: TreeUI = { editing: null, workspaceDialog: null }
const store = createStore<TreeUI>(INITIAL)

export function useTreeUI(): TreeUI {
  return useSyncExternalStore(store.subscribe, store.get, () => INITIAL)
}

export function startEditing(id: string, creating = false) {
  store.set((state) => ({ ...state, editing: { id, creating } }))
}

export function stopEditing() {
  store.set((state) => ({ ...state, editing: null }))
}

export function openWorkspaceDialog(
  dialog: NonNullable<TreeUI["workspaceDialog"]>
) {
  store.set((state) => ({ ...state, workspaceDialog: dialog }))
}

export function closeWorkspaceDialog() {
  store.set((state) => ({ ...state, workspaceDialog: null }))
}
