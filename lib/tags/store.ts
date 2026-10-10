"use client"

import { useSyncExternalStore } from "react"

import type { TagStyleId } from "@/lib/tags/styles"
import { createStore } from "@/lib/utils/store"

/** Tag name to the id of its badge style. Kept in the project's data/. */
export type TagStyles = Record<string, string>

const EMPTY: TagStyles = {}
const store = createStore<TagStyles>(EMPTY)
let started = false

async function load() {
  try {
    const response = await fetch("/api/tags", { cache: "no-store" })
    if (response.ok) {
      store.set((await response.json()) as TagStyles)
    }
  } catch {
    // Tags still show, in the default colour.
  }
}

async function save(styles: TagStyles) {
  store.set(styles)
  const response = await fetch("/api/tags", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(styles),
  })
  if (!response.ok) {
    throw new Error("The tag colours could not be saved.")
  }
}

function subscribe(listener: () => void) {
  if (!started) {
    started = true
    void load()
  }
  return store.subscribe(listener)
}

export function useTagStyles(): TagStyles {
  return useSyncExternalStore(subscribe, store.get, () => EMPTY)
}

/** The stored spelling of a tag, whatever capitals were typed. */
export function knownTagName(name: string): string | undefined {
  const lower = name.toLowerCase()
  return Object.keys(store.get()).find((tag) => tag.toLowerCase() === lower)
}

export function setTagStyle(name: string, style: TagStyleId) {
  return save({ ...store.get(), [name]: style })
}

/** Forgets a tag's colour. Pages that carry the tag are not changed. */
export function forgetTag(name: string) {
  const rest = { ...store.get() }
  delete rest[name]
  return save(rest)
}
