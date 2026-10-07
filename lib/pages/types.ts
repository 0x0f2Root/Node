/**
 * What a record is. Workspaces sit at the root; folders nest inside
 * workspaces and other folders; pages are the Markdown documents and never
 * contain anything. All three share one store, so a future kind (a runbook,
 * a snippet) slots into the same tree.
 */
export type PageKind = "workspace" | "folder" | "page"

export type Page = {
  id: string
  /** The containing workspace or folder; null only for a workspace. */
  parentId: string | null
  kind: PageKind

  title: string
  /** A workspace's one-line summary. */
  description?: string

  /** For a workspace: the id of its icon. */
  icon?: string | null

  /** Markdown/MDX source: the canonical document. */
  content: string

  favorite: boolean

  createdAt: Date
  updatedAt: Date
}

export type CreatePageInput = {
  kind?: PageKind
  description?: string
  title?: string
  parentId?: string | null
  icon?: string | null
  content?: string
  favorite?: boolean
}

export type UpdatePageInput = Partial<
  Pick<
    Page,
    "title" | "description" | "parentId" | "icon" | "content" | "favorite"
  >
>

/** True for the kinds that hold other items. */
export function isContainer(page: Pick<Page, "kind">): boolean {
  return page.kind !== "page"
}

export const DEFAULT_PAGE_TITLE = "Untitled"

/** The title to display: an emptied title reads as "Untitled". */
export function pageTitle(page: Pick<Page, "title">): string {
  return page.title.trim() || DEFAULT_PAGE_TITLE
}
