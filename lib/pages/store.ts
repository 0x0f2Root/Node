"use client"

import { useSyncExternalStore } from "react"

import { remapEventPages } from "@/lib/calendar/events"
import {
  ApiError,
  ApiPageRepository,
  remapPageMeta,
} from "@/lib/pages/api-repository"
import { resolveImage, uploadImage } from "@/lib/pages/assets"
import { idToPath, pathToId, toFileName } from "@/lib/pages/paths"
import { remapRecents } from "@/lib/pages/recents"
import { applyPageUpdate } from "@/lib/pages/repository"
import { getDescendantIds } from "@/lib/pages/tree"
import type { CreatePageInput, Page, UpdatePageInput } from "@/lib/pages/types"
import { remapTaskPages } from "@/lib/tasks/tasks"
import { createStore } from "@/lib/utils/store"

export interface PagesState {
  status: "idle" | "loading" | "ready" | "error"
  pages: Page[]
  error: string | null
}

/** The file changed on disk after Node last read it. */
export class PageConflictError extends Error {
  constructor() {
    super("This page was changed outside Node.")
    this.name = "PageConflictError"
  }
}

const INITIAL: PagesState = { status: "idle", pages: [], error: null }

const store = createStore<PagesState>(INITIAL)

// Pages exist only as files in the project's data/pages/ directory, read
// and written through Node's server. Nothing is kept in browser storage in
// their place.
let repository: ApiPageRepository | null = null

// A page's id is its path, so renaming or moving it changes the id. These
// keep everything that still holds the old one working: `aliases` forwards
// old ids, `keys` gives the editor an identity that survives the change.
const aliases = new Map<string, string>()
const keys = new Map<string, string>()
// Pages with edits not yet written; a refresh from disk leaves them alone.
const dirty = new Set<string>()
const relocationListeners = new Set<(remap: (id: string) => string) => void>()

// Every read and write of the folder runs in order, one at a time, so a save
// can never race the rename of the file it is saving.
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work)
  queue = run.catch(() => undefined)
  return run
}

function requireRepository(): ApiPageRepository {
  repository ??= new ApiPageRepository()
  return repository
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function setPages(update: (pages: Page[]) => Page[]) {
  store.set((state) => ({ ...state, pages: update(state.pages) }))
}

function find(id: string) {
  return store.get().pages.find((page) => page.id === id)
}

/** The id a page has now, for an id it may have had before a rename. */
export function resolvePageId(id: string): string {
  let current = id
  for (let hops = 0; aliases.has(current) && hops < 100; hops += 1) {
    current = aliases.get(current) as string
  }
  return current
}

/** An identity for a page that stays the same when it is renamed. */
export function stablePageKey(id: string): string {
  let key = keys.get(id)
  if (!key) {
    key = crypto.randomUUID()
    keys.set(id, key)
  }
  return key
}

/** Calls back with an id mapping whenever items are renamed or moved. */
export function onPagesRelocated(
  listener: (remap: (id: string) => string) => void
) {
  relocationListeners.add(listener)
  return () => {
    relocationListeners.delete(listener)
  }
}

export function setPageDirty(id: string, value: boolean) {
  const current = resolvePageId(id)
  if (value) {
    dirty.add(current)
  } else {
    dirty.delete(current)
  }
}

// Keeps text already in memory when its file has not changed on disk.
function merge(previous: Page[], listed: Page[]): Page[] {
  const known = new Map(previous.map((page) => [page.id, page]))
  return listed.map((page) => {
    const old = known.get(page.id)
    if (
      old?.kind === "page" &&
      old.loaded !== false &&
      (old.revision === page.revision || dirty.has(page.id))
    ) {
      return {
        ...page,
        content: old.content,
        loaded: true,
        // An edited page keeps the revision it was read at, so saving it
        // notices that the file changed underneath.
        revision: old.revision,
        updatedAt: old.updatedAt,
      }
    }
    return page
  })
}

/** Reads the tree again, picking up changes made outside Node. */
export async function loadPages() {
  const active = requireRepository()
  if (store.get().status !== "ready") {
    store.set((state) => ({ ...state, status: "loading", error: null }))
  }
  try {
    const listed = await enqueue(() => active.listPages())
    store.set((state) => ({
      status: "ready",
      pages: merge(state.pages, listed),
      error: null,
    }))
  } catch (error) {
    // A failed refresh keeps showing what was already read.
    store.set((state) => ({
      status: state.status === "ready" ? "ready" : "error",
      pages: state.pages,
      error: message(error),
    }))
  }
}

function refreshWhenVisible() {
  if (
    document.visibilityState === "visible" &&
    store.get().status === "ready"
  ) {
    // Files may have been edited in another program meanwhile.
    void loadPages()
  }
}

function subscribe(listener: () => void) {
  if (store.get().status === "idle") {
    void loadPages()
    window.addEventListener("focus", refreshWhenVisible)
    document.addEventListener("visibilitychange", refreshWhenVisible)
  }
  return store.subscribe(listener)
}

export function usePagesState(): PagesState {
  return useSyncExternalStore(subscribe, store.get, () => INITIAL)
}

export function getPages(): Page[] {
  return store.get().pages
}

const reading = new Map<string, Promise<void>>()

/** Reads a page's Markdown from its file if that has not happened yet. */
export function ensureContent(id: string): Promise<void> {
  const current = find(id)
  if (!current || current.kind !== "page" || current.loaded !== false) {
    return Promise.resolve()
  }
  const pending = reading.get(id)
  if (pending) {
    return pending
  }
  const active = requireRepository()
  const read = enqueue(async () => {
    const page = await active.getPage(id)
    if (!page) {
      // Removed outside Node since the folder was listed.
      setPages((pages) => pages.filter((item) => item.id !== id))
      return
    }
    setPages((pages) => pages.map((item) => (item.id === id ? page : item)))
  }).finally(() => reading.delete(id))
  reading.set(id, read)
  return read
}

/** Reads every page, for search. */
export async function loadAllContent() {
  for (const page of getPages()) {
    if (page.kind === "page" && page.loaded === false) {
      await ensureContent(page.id).catch(() => undefined)
    }
  }
}

/** Drops unsaved edits to a page and reads it from disk again. */
export function reloadPage(id: string) {
  const current = resolvePageId(id)
  dirty.delete(current)
  setPages((pages) =>
    pages.map((page) =>
      page.id === current ? { ...page, content: "", loaded: false } : page
    )
  )
}

export function createPage(input: CreatePageInput = {}): Promise<Page> {
  const active = requireRepository()
  return enqueue(async () => {
    const page = await active.createPage(input)
    setPages((pages) => [...pages.filter((item) => item.id !== page.id), page])
    return page
  })
}

// After `from` became `to` on disk, everything under it has a new path too.
function relocate(from: string, to: string) {
  const fromPath = idToPath(from)
  const toPath = idToPath(to)
  const remap = (id: string) => {
    const path = idToPath(id)
    if (path === fromPath) {
      return to
    }
    return path.startsWith(`${fromPath}/`)
      ? pathToId(toPath + path.slice(fromPath.length))
      : id
  }

  const moved = store
    .get()
    .pages.map((page) => page.id)
    .filter((id) => remap(id) !== id)
  for (const id of moved) {
    const next = remap(id)
    aliases.delete(next)
    aliases.set(id, next)
    const key = keys.get(id)
    if (key) {
      keys.delete(id)
      keys.set(next, key)
    }
    if (dirty.delete(id)) {
      dirty.add(next)
    }
  }

  setPages((pages) =>
    pages.map((page) => ({
      ...page,
      id: remap(page.id),
      parentId: page.parentId === null ? null : remap(page.parentId),
    }))
  )
  // Node's own references to the page follow it.
  remapPageMeta(remap)
  remapRecents(remap)
  remapTaskPages(remap)
  remapEventPages(remap)
  relocationListeners.forEach((listener) => listener(remap))
}

/**
 * Changes a page, folder or workspace and resolves to its id, which is a new
 * one after a rename or move.
 *
 * Text and favourites are optimistic: the store changes at once so typing
 * never waits on the disk, and a failed write keeps the edit in memory for a
 * retry. `force` writes even though the file changed outside Node.
 */
export function updatePage(
  id: string,
  input: UpdatePageInput,
  options: { force?: boolean } = {}
): Promise<string> {
  const active = requireRepository()
  const { title, parentId, ...rest } = input
  const first = find(resolvePageId(id))
  if (!first) {
    return Promise.reject(new Error("This item no longer exists."))
  }
  if (Object.keys(rest).length > 0) {
    const updated = { ...applyPageUpdate(first, rest), loaded: true }
    setPages((pages) =>
      pages.map((page) => (page.id === first.id ? updated : page))
    )
  }

  return enqueue(async () => {
    let currentId = resolvePageId(id)
    const current = find(currentId)
    if (!current) {
      throw new Error("This item no longer exists.")
    }

    if (Object.keys(rest).length > 0) {
      // The server refuses the text if the file changed since it was read.
      const written = await active
        .updatePage(
          currentId,
          rest,
          options.force ? undefined : current.revision
        )
        .catch((error: unknown) => {
          throw error instanceof ApiError && error.status === 409
            ? new PageConflictError()
            : error
        })
      setPages((pages) =>
        pages.map((page) =>
          page.id === currentId
            ? { ...page, revision: written.revision ?? page.revision }
            : page
        )
      )
    }

    const renamed = title !== undefined && toFileName(title) !== current.title
    const moved = parentId !== undefined && parentId !== current.parentId
    if (renamed || moved) {
      const result = await active.updatePage(currentId, {
        ...(renamed ? { title } : null),
        ...(moved ? { parentId } : null),
      })
      if (result.id !== currentId) {
        relocate(currentId, result.id)
        currentId = result.id
      }
      setPages((pages) =>
        pages.map((page) =>
          page.id === currentId
            ? {
                ...page,
                kind: result.kind,
                title: result.title,
                parentId: result.parentId,
                revision: result.revision ?? page.revision,
              }
            : page
        )
      )
    }
    return currentId
  })
}

/** Deletes a page, or a folder with everything in it, from disk. */
export function deletePage(id: string): Promise<void> {
  const active = requireRepository()
  return enqueue(async () => {
    const currentId = resolvePageId(id)
    const ids = [currentId, ...getDescendantIds(store.get().pages, currentId)]
    await active.deletePage(currentId)
    for (const removed of ids) {
      dirty.delete(removed)
      keys.delete(removed)
    }
    setPages((pages) => pages.filter((page) => !ids.includes(page.id)))
  })
}

/**
 * A name no sibling already uses: "Nmap", then "Nmap (2)", "Nmap (3)".
 * Names become file names, so two siblings cannot share one.
 */
export function uniqueTitle(
  parentId: string | null,
  title: string,
  ignoreId?: string
): string {
  const base = toFileName(title)
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
  const active = requireRepository()
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
    const content =
      item.kind === "page" && item.loaded === false
        ? ((await active.getPage(item.id))?.content ?? "")
        : item.content
    const created = await createPage({
      kind: item.kind,
      title,
      description: item.description,
      parentId,
      icon: item.icon,
      content,
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

/** Saves a pasted or dropped image beside the notes; returns its link. */
export function saveImage(pageId: string, file: File): Promise<string> {
  const active = requireRepository()
  return enqueue(() =>
    uploadImage(active, idToPath(resolvePageId(pageId)), file)
  )
}

/** A URL the editor can display for an image link in a page. */
export function imageSource(pageId: string, src: string): string {
  return resolveImage(idToPath(resolvePageId(pageId)), src)
}
