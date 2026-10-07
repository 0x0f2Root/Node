import { organizeIntoWorkspace, type LegacyPage } from "@/lib/pages/migrate"
import { createSeedPages } from "@/lib/pages/seed"
import {
  DEFAULT_PAGE_TITLE,
  type CreatePageInput,
  type Page,
  type UpdatePageInput,
} from "@/lib/pages/types"

export interface PageRepository {
  getPage(id: string): Promise<Page | null>

  createPage(input: CreatePageInput): Promise<Page>

  updatePage(id: string, input: UpdatePageInput): Promise<Page>

  deletePage(id: string): Promise<void>

  listPages(): Promise<Page[]>
}

// Only edits to the document itself count as an update; favoriting or moving
// a page leaves its "Updated" time alone.
export function applyPageUpdate(page: Page, input: UpdatePageInput): Page {
  const touched =
    (input.title !== undefined && input.title !== page.title) ||
    (input.content !== undefined && input.content !== page.content)

  return {
    ...page,
    ...input,
    updatedAt: touched ? new Date() : page.updatedAt,
  }
}

// `kind` is optional here only: records written before workspaces lack it.
type StoredPage = Omit<LegacyPage, "createdAt" | "updatedAt"> & {
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "node.pages.v1"

/**
 * Browser-local persistence. Pages are stored as one JSON array whose
 * `content` fields are the Markdown/MDX source, untouched.
 */
export class LocalStoragePageRepository implements PageRepository {
  constructor(private readonly key: string = STORAGE_KEY) {}

  private read(): Page[] {
    const raw = window.localStorage.getItem(this.key)
    if (raw === null) {
      const seeded = organizeIntoWorkspace(createSeedPages())
      this.write(seeded)
      return seeded
    }
    const stored = (JSON.parse(raw) as StoredPage[]).map((page) => ({
      ...page,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
    }))

    // Data from before workspaces existed has no `kind`. It is reorganised
    // once; the original is kept untouched under a backup key first.
    if (stored.some((page) => page.kind === undefined)) {
      const backupKey = `${this.key}.backup-pre-workspaces`
      if (window.localStorage.getItem(backupKey) === null) {
        window.localStorage.setItem(backupKey, raw)
      }
      const migrated = organizeIntoWorkspace(stored)
      this.write(migrated)
      return migrated
    }
    return stored as Page[]
  }

  private write(pages: Page[]) {
    window.localStorage.setItem(this.key, JSON.stringify(pages))
  }

  async listPages() {
    return this.read()
  }

  async getPage(id: string) {
    return this.read().find((page) => page.id === id) ?? null
  }

  async createPage(input: CreatePageInput) {
    const now = new Date()
    const page: Page = {
      id: crypto.randomUUID(),
      parentId: input.parentId ?? null,
      kind: input.kind ?? "page",
      title: input.title ?? DEFAULT_PAGE_TITLE,
      description: input.description,
      icon: input.icon ?? null,
      content: input.content ?? "",
      favorite: input.favorite ?? false,
      createdAt: now,
      updatedAt: now,
    }
    this.write([...this.read(), page])
    return page
  }

  async updatePage(id: string, input: UpdatePageInput) {
    const pages = this.read()
    const current = pages.find((page) => page.id === id)
    if (!current) {
      throw new Error("This page no longer exists.")
    }
    const updated = applyPageUpdate(current, input)
    this.write(pages.map((page) => (page.id === id ? updated : page)))
    return updated
  }

  async deletePage(id: string) {
    this.write(this.read().filter((page) => page.id !== id))
  }
}
