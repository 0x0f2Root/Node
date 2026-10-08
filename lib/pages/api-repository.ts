import {
  baseName,
  extensionOf,
  idToPath,
  isPageFile,
  joinPath,
  parentPath,
  pathToId,
  titleOfFile,
  toFileName,
} from "@/lib/pages/paths"
import type { PageRepository } from "@/lib/pages/repository"
import type { CreatePageInput, Page, UpdatePageInput } from "@/lib/pages/types"
import { createPersistentStore } from "@/lib/utils/store"

// What the server reports for a file or directory in data/pages/.
interface Entry {
  path: string
  directory: boolean
  modified: number
}

// What a file or directory cannot carry itself stays in browser storage,
// keyed by id: which pages are starred, and a workspace's icon and summary.
// Neither holds any Markdown.
const favorites = createPersistentStore<string[]>("node.favorites.v1", [])
const workspaceMeta = createPersistentStore<
  Record<string, { icon?: string | null; description?: string }>
>("node.workspace-meta.v1", {})

/** Rewrites stored ids after a rename or move; `remap` returns the new id. */
export function remapPageMeta(remap: (id: string) => string) {
  favorites.set((ids) => ids.map(remap))
  workspaceMeta.set((meta) =>
    Object.fromEntries(
      Object.entries(meta).map(([id, value]) => [remap(id), value])
    )
  )
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, { cache: "no-store", ...init })
  } catch {
    throw new ApiError("Node's server could not be reached.", 0)
  }
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new ApiError(
      detail?.error ?? "The pages directory could not be reached.",
      response.status
    )
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

function send<T>(method: string, body: unknown) {
  return call<T>("/api/pages", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function describe(entry: Entry, content?: string): Page {
  const id = pathToId(entry.path)
  const parent = parentPath(entry.path)
  const date = new Date(entry.modified)

  if (entry.directory) {
    const top = parent === ""
    const meta = top ? workspaceMeta.get()[id] : undefined
    return {
      id,
      parentId: top ? null : pathToId(parent),
      kind: top ? "workspace" : "folder",
      title: baseName(entry.path),
      description: meta?.description,
      icon: meta?.icon ?? null,
      content: "",
      favorite: false,
      createdAt: date,
      updatedAt: date,
    }
  }
  return {
    id,
    parentId: parent ? pathToId(parent) : null,
    kind: "page",
    title: titleOfFile(baseName(entry.path)),
    icon: null,
    content: content ?? "",
    loaded: content !== undefined,
    revision: entry.modified,
    favorite: favorites.get().includes(id),
    createdAt: date,
    updatedAt: date,
  }
}

/**
 * Pages as real files in the project's data/pages/ directory, reached
 * through Node's own server. The Markdown on disk is the only copy of a
 * page's text; nothing here keeps one.
 */
export class ApiPageRepository implements PageRepository {
  /** Reads the tree: names and dates only. Page text is read when opened. */
  async listPages(): Promise<Page[]> {
    const { entries } = await call<{ entries: Entry[] }>("/api/pages")
    return entries.map((entry) => describe(entry))
  }

  async getPage(id: string): Promise<Page | null> {
    const path = idToPath(id)
    if (!path) {
      return null
    }
    const query = `/api/pages?path=${encodeURIComponent(path)}`
    try {
      if (!isPageFile(path)) {
        return describe(await call<Entry>(`${query}&stat=1`))
      }
      const page = await call<{ content: string; modified: number }>(query)
      return describe(
        { path, directory: false, modified: page.modified },
        page.content
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async createPage(input: CreatePageInput): Promise<Page> {
    const kind = input.kind ?? "page"
    const parent =
      kind === "workspace" || !input.parentId ? "" : idToPath(input.parentId)
    const path = joinPath(
      parent,
      toFileName(input.title ?? "Untitled") + (kind === "page" ? ".md" : "")
    )
    const entry = await send<Entry>("POST", {
      path,
      directory: kind !== "page",
      content: input.content ?? "",
    })

    const id = pathToId(entry.path)
    if (kind === "workspace" && (input.icon || input.description)) {
      workspaceMeta.set((meta) => ({
        ...meta,
        [id]: { icon: input.icon, description: input.description },
      }))
    }
    return describe(entry, kind === "page" ? (input.content ?? "") : undefined)
  }

  /**
   * `expected` is the modification time the text was read at: the server
   * refuses the write (status 409) when the file has changed since.
   */
  async updatePage(
    id: string,
    input: UpdatePageInput,
    expected?: number
  ): Promise<Page> {
    let path = idToPath(id)
    if (!path) {
      throw new Error("This item no longer exists.")
    }
    const page = isPageFile(path)
    let entry: Entry | null = null

    if (input.content !== undefined && page) {
      entry = await send<Entry>("PATCH", {
        path,
        content: input.content,
        expected,
      })
    }

    if (input.title !== undefined || input.parentId !== undefined) {
      const destination =
        input.parentId === undefined
          ? parentPath(path)
          : input.parentId === null
            ? ""
            : idToPath(input.parentId)
      const name =
        input.title === undefined
          ? baseName(path)
          : toFileName(input.title) + (page ? extensionOf(path) : "")
      const to = joinPath(destination, name)
      if (to !== path) {
        entry = await send<Entry>("PATCH", { path, to })
        path = to
      }
    }

    const nextId = pathToId(path)
    if (input.favorite !== undefined) {
      favorites.set((ids) =>
        input.favorite
          ? [...ids.filter((item) => item !== nextId), nextId]
          : ids.filter((item) => item !== nextId)
      )
    }
    if (input.icon !== undefined || input.description !== undefined) {
      workspaceMeta.set((meta) => ({
        ...meta,
        [nextId]: {
          ...meta[nextId],
          ...(input.icon !== undefined ? { icon: input.icon } : null),
          ...(input.description !== undefined
            ? { description: input.description }
            : null),
        },
      }))
    }

    entry ??= await call<Entry>(
      `/api/pages?path=${encodeURIComponent(path)}&stat=1`
    )
    return describe(entry)
  }

  async deletePage(id: string): Promise<void> {
    const path = idToPath(id)
    if (!path) {
      return
    }
    await send("DELETE", { path })
    favorites.set((ids) => ids.filter((item) => item !== id))
  }

  /** Stores an image in data/pages/assets/. Returns its path there. */
  async saveAsset(file: File): Promise<string> {
    const form = new FormData()
    form.set("file", file)
    const { path } = await call<{ path: string }>("/api/pages/assets", {
      method: "POST",
      body: form,
    })
    return path
  }
}
