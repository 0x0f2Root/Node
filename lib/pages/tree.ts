import type { Page } from "@/lib/pages/types"

export interface PageNode {
  page: Page
  children: PageNode[]
}

export const WORKSPACE_LABEL = "Workspace"

// Folders before pages, then by name, like a file explorer.
function byName(a: Page, b: Page) {
  return (
    Number(b.kind !== "page") - Number(a.kind !== "page") ||
    a.title.localeCompare(b.title, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  )
}

/**
 * Where something new should go, given what is on screen: the folder or
 * workspace being viewed, or the one containing the page being viewed.
 * Falls back to the first workspace; null when there is none.
 */
export function destinationFor(
  pages: Page[],
  currentId: string | null
): string | null {
  const current = pages.find((page) => page.id === currentId)
  if (current) {
    return current.kind === "page" ? current.parentId : current.id
  }
  return (
    pages.filter((page) => page.kind === "workspace").sort(byName)[0]?.id ??
    null
  )
}

export function buildTree(pages: Page[]): PageNode[] {
  const ids = new Set(pages.map((page) => page.id))
  const childrenOf = new Map<string | null, Page[]>()

  for (const page of pages) {
    // A page whose parent is gone surfaces at the root instead of vanishing.
    const parent =
      page.parentId !== null && ids.has(page.parentId) ? page.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings) {
      siblings.push(page)
    } else {
      childrenOf.set(parent, [page])
    }
  }

  function nodesFor(parentId: string | null): PageNode[] {
    return (childrenOf.get(parentId) ?? [])
      .sort(byName)
      .map((page) => ({ page, children: nodesFor(page.id) }))
  }

  return nodesFor(null)
}

/** Ancestors from the root down to the direct parent. */
export function getAncestors(pages: Page[], id: string): Page[] {
  const byId = new Map(pages.map((page) => [page.id, page]))
  const ancestors: Page[] = []
  const seen = new Set<string>([id])

  let parentId = byId.get(id)?.parentId ?? null
  while (parentId !== null && !seen.has(parentId)) {
    const parent = byId.get(parentId)
    if (!parent) {
      break
    }
    ancestors.unshift(parent)
    seen.add(parentId)
    parentId = parent.parentId
  }

  return ancestors
}

export function getDescendantIds(pages: Page[], id: string): string[] {
  const descendants: string[] = []
  const queue = [id]

  while (queue.length > 0) {
    const current = queue.shift()
    for (const page of pages) {
      if (page.parentId === current && !descendants.includes(page.id)) {
        descendants.push(page.id)
        queue.push(page.id)
      }
    }
  }

  return descendants
}

/** "Pentesting / Web" for a page in the Web folder of Pentesting. */
export function pagePath(pages: Page[], id: string): string {
  const ancestors = getAncestors(pages, id)
  return ancestors.length > 0
    ? ancestors.map((page) => page.title || "Untitled").join(" / ")
    : WORKSPACE_LABEL
}

/** The list of every page carrying a tag. */
export function tagHref(tag: string) {
  return `/workspace?tag=${encodeURIComponent(tag)}`
}

export function pageHref(id: string) {
  return `/workspace/${id}`
}
