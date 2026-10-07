"use client"

import { useCallback, useSyncExternalStore } from "react"

import { github } from "@/lib/repositories/github"
import type {
  RepositoryFile,
  RepositoryProvider,
  RepositorySource,
} from "@/lib/repositories/types"
import {
  deleteAssetsByPrefix,
  getAsset,
  getAssetsByPrefix,
  putAsset,
  putAssets,
} from "@/lib/storage/asset-db"
import { createPersistentStore, createStore } from "@/lib/utils/store"

// The local snapshot of every imported repository.
//
//   localStorage  node.repositories.v1   the list of sources (small)
//   IndexedDB     <id>/tree              the file tree
//                 <id>/file/<path>       each stored file's text
//                 <id>/image/<path>      images, cached when first viewed
//
// After an import nothing here needs the network.

const STORE = "repositories"
const EMPTY: RepositorySource[] = []

const sources = createPersistentStore<RepositorySource[]>(
  "node.repositories.v1",
  EMPTY
)

/** The provider behind a source. One today; the lookup is the seam. */
export function providerFor(
  source: Pick<RepositorySource, "provider">
): RepositoryProvider {
  switch (source.provider) {
    case "github":
      return github
  }
}

export function useRepositories(): RepositorySource[] {
  return useSyncExternalStore(sources.subscribe, sources.get, sources.getServer)
}

export function getRepositories(): RepositorySource[] {
  return sources.get()
}

// File trees, loaded from IndexedDB the first time something asks for them.
const trees = createStore<Record<string, RepositoryFile[]>>({})
const loading = new Set<string>()
// Every stored file's text, per repository: built on demand for search.
const contents = new Map<string, Promise<Map<string, string>>>()
const imageUrls = new Map<string, string>()

function ensureTree(id: string) {
  if (id in trees.get() || loading.has(id)) {
    return
  }
  loading.add(id)
  void getAsset<RepositoryFile[]>(STORE, `${id}/tree`)
    .catch(() => undefined)
    .then((files) => {
      loading.delete(id)
      trees.set((current) => ({ ...current, [id]: files ?? [] }))
    })
}

/** A repository's files, or undefined while they load. Pass null to skip. */
export function useRepositoryFiles(
  id: string | null
): RepositoryFile[] | undefined {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (id) {
        ensureTree(id)
      }
      return trees.subscribe(listener)
    },
    [id]
  )
  return useSyncExternalStore(
    subscribe,
    () => (id ? trees.get()[id] : undefined),
    () => undefined
  )
}

/** Trees already in memory, for the command palette's file lookup. */
export function useLoadedTrees(
  load: boolean
): Record<string, RepositoryFile[]> {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (load) {
        sources.get().forEach((source) => ensureTree(source.id))
      }
      return trees.subscribe(listener)
    },
    [load]
  )
  return useSyncExternalStore(subscribe, trees.get, trees.get)
}

export function readFile(id: string, path: string) {
  return getAsset<string>(STORE, `${id}/file/${path}`)
}

/** path -> text for every stored file. Read once, then kept in memory. */
export function readAllFiles(id: string): Promise<Map<string, string>> {
  let pending = contents.get(id)
  if (!pending) {
    const prefix = `${id}/file/`
    pending = getAssetsByPrefix<string>(STORE, prefix).then(
      (entries) =>
        new Map(entries.map(([key, text]) => [key.slice(prefix.length), text]))
    )
    contents.set(id, pending)
  }
  return pending
}

function forget(id: string) {
  contents.delete(id)
  for (const [key, url] of imageUrls) {
    if (key.startsWith(`${id}/`)) {
      URL.revokeObjectURL(url)
      imageUrls.delete(key)
    }
  }
}

/** Replaces a repository's snapshot with a freshly imported one. */
export async function saveSnapshot(
  source: RepositorySource,
  files: RepositoryFile[],
  texts: readonly (readonly [string, string])[]
) {
  await deleteAssetsByPrefix(STORE, `${source.id}/`)
  await putAssets(STORE, [
    [`${source.id}/tree`, files],
    ...texts.map(
      ([path, text]) => [`${source.id}/file/${path}`, text] as const
    ),
  ])

  forget(source.id)
  trees.set((current) => ({ ...current, [source.id]: files }))
  sources.set((current) =>
    current.some((item) => item.id === source.id)
      ? current.map((item) => (item.id === source.id ? source : item))
      : [...current, source]
  )
}

/** Deletes the local snapshot. The remote repository is never touched. */
export async function removeRepository(id: string) {
  sources.set((current) => current.filter((source) => source.id !== id))
  trees.set((current) => {
    const next = { ...current }
    delete next[id]
    return next
  })
  forget(id)
  await deleteAssetsByPrefix(STORE, `${id}/`)
}

/**
 * A displayable URL for an image in the repository. The image is downloaded
 * the first time it is needed and kept, so it is available offline after.
 */
export async function imageUrl(
  source: RepositorySource,
  path: string
): Promise<string> {
  const key = `${source.id}/image/${path}`
  const known = imageUrls.get(key)
  if (known) {
    return known
  }

  let blob = await getAsset<Blob>(STORE, key)
  if (!blob) {
    const bytes = await providerFor(source).fetchFile(source, path)
    blob = new Blob([bytes], {
      type: path.toLowerCase().endsWith(".svg") ? "image/svg+xml" : undefined,
    })
    void putAsset(STORE, key, blob)
  }
  const url = URL.createObjectURL(blob)
  imageUrls.set(key, url)
  return url
}

// Whether the import dialog is open, and with which URL prefilled.
const importDialog = createStore<{ open: boolean; url: string }>({
  open: false,
  url: "",
})

export function useImportDialog() {
  return useSyncExternalStore(
    importDialog.subscribe,
    importDialog.get,
    importDialog.get
  )
}

export function openImportDialog(url = "") {
  importDialog.set({ open: true, url })
}

export function closeImportDialog() {
  importDialog.set((current) => ({ ...current, open: false }))
}
