"use client"

import { useSyncExternalStore } from "react"

import { createPersistentStore } from "@/lib/utils/store"

export type EditorWidth = "comfortable" | "full"
export type EditorFontSize = "small" | "default" | "large"

export interface EditorSettings {
  editorWidth: EditorWidth
  fontSize: EditorFontSize
}

export const DEFAULT_SETTINGS: EditorSettings = {
  editorWidth: "comfortable",
  fontSize: "default",
}

export const FONT_SIZE_PX: Record<EditorFontSize, number> = {
  small: 15,
  default: 16,
  large: 18,
}

const store = createPersistentStore<EditorSettings>(
  "node.settings.v1",
  DEFAULT_SETTINGS
)

export function useEditorSettings(): EditorSettings {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer)
}

export function updateEditorSettings(patch: Partial<EditorSettings>) {
  store.set((settings) => ({ ...settings, ...patch }))
}
