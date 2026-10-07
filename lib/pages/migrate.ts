import type { Page, PageKind } from "@/lib/pages/types"

export const DEFAULT_WORKSPACE_TITLE = "General"

/** A page as stored before workspaces and folders existed. */
export type LegacyPage = Omit<Page, "kind"> & { kind?: PageKind }

/**
 * Reshapes a flat set of nestable pages into Workspace -> Folder -> Page.
 *
 * - Everything is placed in one workspace, "General".
 * - A page that had child pages becomes a folder of the same name. Its own
 *   text, if it had any, stays a page inside that folder.
 * - Every page keeps its id, so links, favourites, recents and anything that
 *   points at a page still resolve. Only the new folders get new ids.
 */
export function organizeIntoWorkspace(legacy: LegacyPage[]): Page[] {
  if (legacy.length === 0) {
    return []
  }

  const ids = new Set(legacy.map((page) => page.id))
  const parents = new Set(
    legacy
      .map((page) => page.parentId)
      .filter((id): id is string => id !== null && ids.has(id))
  )
  const earliest = Math.min(...legacy.map((page) => page.createdAt.getTime()))

  const workspace: Page = {
    id: crypto.randomUUID(),
    parentId: null,
    kind: "workspace",
    title: DEFAULT_WORKSPACE_TITLE,
    icon: null,
    content: "",
    favorite: false,
    createdAt: new Date(earliest - 1000),
    updatedAt: new Date(),
  }

  // parent page id -> id of the folder that takes its place. An empty parent
  // page simply becomes the folder; one with text gets a new folder around it.
  const folderFor = new Map<string, string>()
  for (const page of legacy) {
    if (parents.has(page.id)) {
      folderFor.set(
        page.id,
        page.content.trim() === "" ? page.id : crypto.randomUUID()
      )
    }
  }

  const containerOf = (page: LegacyPage) =>
    page.parentId !== null && ids.has(page.parentId)
      ? (folderFor.get(page.parentId) ?? workspace.id)
      : workspace.id

  const result: Page[] = [workspace]
  for (const page of legacy) {
    const folderId = folderFor.get(page.id)

    if (folderId === undefined) {
      result.push({ ...page, kind: "page", parentId: containerOf(page) })
    } else if (folderId === page.id) {
      result.push({
        ...page,
        kind: "folder",
        favorite: false,
        parentId: containerOf(page),
      })
    } else {
      result.push({
        id: folderId,
        parentId: containerOf(page),
        kind: "folder",
        title: page.title,
        icon: null,
        content: "",
        favorite: false,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })
      result.push({ ...page, kind: "page", parentId: folderId })
    }
  }

  return result
}
