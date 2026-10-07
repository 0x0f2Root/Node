"use client"

import { useSyncExternalStore } from "react"

import {
  LocalStoragePageRepository,
  applyPageUpdate,
  type PageRepository,
} from "@/lib/pages/repository"
import { getDescendantIds } from "@/lib/pages/tree"
import type { CreatePageInput, Page, UpdatePageInput } from "@/lib/pages/types"
import { createStore } from "@/lib/utils/store"

export interface PagesState {
  status: "idle" | "loading" | "ready" | "error"
  pages: Page[]
  error: string | null
}

const INITIAL: PagesState = { status: "idle", pages: [], error: null }

const store = createStore<PagesState>(INITIAL)

// The one place that knows which backend is in use. Swap the implementation
// here (API, SQLite, filesystem) and nothing above this module changes.
let repository: PageRepository | null = null

function getRepository(): PageRepository {
  repository ??= new LocalStoragePageRepository()
  return repository
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function setPages(update: (pages: Page[]) => Page[]) {
  store.set((state) => ({ ...state, pages: update(state.pages) }))
}

export async function loadPages() {
  store.set((state) => ({ ...state, status: "loading", error: null }))
  try {
    const pages = await getRepository().listPages()
    store.set({ status: "ready", pages, error: null })
  } catch (error) {
    store.set({ status: "error", pages: [], error: message(error) })
  }
}

function subscribe(listener: () => void) {
  if (store.get().status === "idle") {
    void loadPages()
  }
  return store.subscribe(listener)
}

export function usePagesState(): PagesState {
  return useSyncExternalStore(subscribe, store.get, () => INITIAL)
}

export function getPages(): Page[] {
  return store.get().pages
}

export async function createPage(input: CreatePageInput = {}): Promise<Page> {
  const page = await getRepository().createPage(input)
  setPages((pages) => [...pages, page])
  return page
}

// Optimistic: the store changes at once so typing never waits on storage.
// If the write fails the in-memory edit is kept, so nothing typed is lost
// and the caller can retry.
export async function updatePage(
  id: string,
  input: UpdatePageInput
): Promise<void> {
  const current = store.get().pages.find((page) => page.id === id)
  if (!current) {
    throw new Error("This page no longer exists.")
  }
  const updated = applyPageUpdate(current, input)
  setPages((pages) => pages.map((page) => (page.id === id ? updated : page)))
  await getRepository().updatePage(id, input)
}

/** Deletes a page together with everything nested under it. */
export async function deletePage(id: string): Promise<void> {
  const ids = [id, ...getDescendantIds(store.get().pages, id)]
  for (const target of ids) {
    await getRepository().deletePage(target)
  }
  setPages((pages) => pages.filter((page) => !ids.includes(page.id)))
}

/**
 * A title no sibling already uses: "Nmap", then "Nmap (2)", "Nmap (3)".
 * Names are for people; ids, not names, identify a page.
 */
export function uniqueTitle(
  parentId: string | null,
  title: string,
  ignoreId?: string
): string {
  const base = title.trim() || "Untitled"
  const taken = new Set(
    store
      .get()
      .pages.filter(
        (page) => page.parentId === parentId && page.id !== ignoreId
      )
      .map((page) => page.title.trim().toLowerCase())
  )
  if (!taken.has(base.toLowerCase())) {
    return base
  }
  let count = 2
  while (taken.has(`${base} (${count})`.toLowerCase())) {
    count += 1
  }
  return `${base} (${count})`
}

/** Copies a page, or a folder or workspace with everything inside it. */
export async function duplicatePage(id: string): Promise<Page> {
  const all = store.get().pages
  const source = all.find((page) => page.id === id)
  if (!source) {
    throw new Error("This item no longer exists.")
  }

  async function copy(
    item: Page,
    parentId: string | null,
    title: string
  ): Promise<Page> {
    const created = await createPage({
      kind: item.kind,
      title,
      description: item.description,
      parentId,
      icon: item.icon,
      content: item.content,
    })
    for (const child of all.filter((page) => page.parentId === item.id)) {
      await copy(child, created.id, child.title)
    }
    return created
  }

  return copy(
    source,
    source.parentId,
    uniqueTitle(source.parentId, `${source.title || "Untitled"} copy`)
  )
}
