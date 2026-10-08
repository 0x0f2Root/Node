import { remapEventPages } from "@/lib/calendar/events"
import { organizeIntoWorkspace, type LegacyPage } from "@/lib/pages/migrate"
import { remapRecents } from "@/lib/pages/recents"
import { toFileName } from "@/lib/pages/paths"
import { createPage, getPages, updatePage } from "@/lib/pages/store"
import { getAncestors } from "@/lib/pages/tree"
import type { Page } from "@/lib/pages/types"
import { remapTaskPages } from "@/lib/tasks/tasks"

// Pages written before Node stored files, as one JSON array in the browser.
// This key is only ever read here: it is left in place as a backup.
// (An earlier build also kept seed pages there, so it exists for everyone.)
const LEGACY_KEY = "node.pages.v1"
const DONE_KEY = "node.pages.v1.copied-to-folder"

function readLegacy(): Page[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY)
    if (raw === null) {
      return []
    }
    const stored = (
      JSON.parse(raw) as (Omit<LegacyPage, "createdAt" | "updatedAt"> & {
        createdAt: string
        updatedAt: string
      })[]
    ).map((page) => ({
      ...page,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
    }))
    return stored.some((page) => page.kind === undefined)
      ? organizeIntoWorkspace(stored)
      : (stored as Page[])
  } catch {
    return []
  }
}

/** How many documents are still stored in this browser. */
export function countLegacyPages(): number {
  return readLegacy().filter((page) => page.kind === "page").length
}

/** True until the browser-stored pages have been copied into data/pages/. */
export function legacyImportPending(): boolean {
  return (
    window.localStorage.getItem(DONE_KEY) === null && countLegacyPages() > 0
  )
}

export interface LegacyImportResult {
  copied: number
  /** Workspaces and folders that had to be created. */
  folders: number
  /** Documents left out because a file with that name was already there. */
  skipped: number
}

/**
 * Writes the browser-stored pages into data/pages/ as Markdown files,
 * keeping their workspaces and folders. An existing file is never replaced,
 * and the browser copy is not removed.
 */
export async function copyLegacyPages(): Promise<LegacyImportResult> {
  const legacy = readLegacy()
  const newIds = new Map<string, string>()
  const result: LegacyImportResult = { copied: 0, folders: 0, skipped: 0 }

  function existing(parentId: string | null, item: Page) {
    return getPages().find(
      (page) =>
        page.parentId === parentId &&
        (page.kind === "page") === (item.kind === "page") &&
        page.title.toLowerCase() === toFileName(item.title).toLowerCase()
    )
  }

  // Parents before children.
  const ordered = [...legacy].sort(
    (a, b) =>
      getAncestors(legacy, a.id).length - getAncestors(legacy, b.id).length
  )
  for (const item of ordered) {
    const parentId = item.parentId === null ? null : newIds.get(item.parentId)
    if (parentId === undefined) {
      // Its folder could not be created.
      result.skipped += Number(item.kind === "page")
      continue
    }
    const found = existing(parentId, item)
    if (found) {
      if (item.kind === "page") {
        result.skipped += 1
      } else {
        newIds.set(item.id, found.id)
      }
      continue
    }
    try {
      const created = await createPage({
        kind: item.kind,
        parentId,
        title: toFileName(item.title),
        description: item.description,
        icon: item.icon,
        content: item.content,
      })
      newIds.set(item.id, created.id)
      if (item.kind === "page") {
        result.copied += 1
        if (item.favorite) {
          await updatePage(created.id, { favorite: true })
        }
      } else {
        result.folders += 1
      }
    } catch {
      result.skipped += Number(item.kind === "page")
    }
  }

  // Links from tasks, events and the recent list follow the copies.
  const remap = (id: string) => newIds.get(id) ?? id
  remapRecents(remap)
  remapTaskPages(remap)
  remapEventPages(remap)

  window.localStorage.setItem(DONE_KEY, new Date().toISOString())
  return result
}

/** Stops offering the copy without doing it. */
export function dismissLegacyImport() {
  window.localStorage.setItem(DONE_KEY, "dismissed")
}
