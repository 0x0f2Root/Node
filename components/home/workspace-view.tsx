"use client"

import Link from "next/link"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { PageList, type PageListItem } from "@/components/pages/page-list"
import { usePageActions } from "@/components/pages/use-page-actions"
import { Badge } from "@/components/reui/badge"
import { TagBadge } from "@/components/tags/tag-badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPages, usePagesState } from "@/lib/pages/store"
import { tagHref } from "@/lib/pages/tree"
import { useEditorSettings } from "@/lib/settings/store"
import { cn } from "@/lib/utils"
import {
  AlertCircleIcon,
  FileTextIcon,
  SquarePenIcon,
  UploadIcon,
} from "lucide-react"

/**
 * Every page in the workspace, most recently updated first. With `tag`,
 * only the pages carrying that tag.
 */
export function WorkspaceView({ tag }: { tag?: string }) {
  const { status, pages, error } = usePagesState()
  const actions = usePageActions()
  const { importMarkdown } = useWorkspaceUI()

  const { editorWidth } = useEditorSettings()

  const loading = status === "idle" || status === "loading"
  const documents = pages.filter((page) => page.kind === "page")
  // Every tag in use, with the number of pages carrying it.
  const tagCounts = new Map<string, number>()
  for (const page of documents) {
    for (const name of page.tags ?? []) {
      tagCounts.set(name, (tagCounts.get(name) ?? 0) + 1)
    }
  }
  const tags = [...tagCounts.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )
  const items = documents
    .filter((page) => !tag || page.tags?.includes(tag))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((page): PageListItem => ({ page, date: page.updatedAt }))

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-5 pt-10 pb-24 sm:px-8 md:pt-16",
        // All pages follows the same Page width setting as documents.
        editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-2xl"
      )}
    >
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="mt-1 min-h-5 text-sm text-muted-foreground">
            {status === "ready"
              ? `${items.length} ${items.length === 1 ? "page" : "pages"}${
                  tag ? ` tagged “${tag}”` : ""
                }`
              : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => void actions.create(null)}>
          <SquarePenIcon data-icon="inline-start" />
          New page
        </Button>
      </header>

      {tags.length > 0 || tag ? (
        <nav
          aria-label="Filter by tag"
          className="flex flex-wrap items-center gap-1.5 pt-4"
        >
          <Badge
            variant={tag ? "outline" : "default"}
            render={<Link href="/workspace" />}
          >
            All
          </Badge>
          {tags.map((name) => (
            <TagBadge
              key={name}
              name={name}
              aria-current={name === tag ? "true" : undefined}
              className={cn(
                name === tag && "ring-2 ring-ring ring-offset-1",
                tag && name !== tag && "opacity-60 hover:opacity-100"
              )}
              render={
                <Link href={name === tag ? "/workspace" : tagHref(name)} />
              }
            />
          ))}
        </nav>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-5 pt-5" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-52" />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircleIcon />
            </EmptyMedia>
            <EmptyTitle>The workspace could not be loaded</EmptyTitle>
            <EmptyDescription>
              {error ?? "The pages directory could not be read."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadPages()}
            >
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      ) : items.length === 0 && tag ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No pages tagged “{tag}”</EmptyTitle>
            <EmptyDescription>
              Add the tag from a page, under its title.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No pages yet</EmptyTitle>
            <EmptyDescription>
              Create your first page, or bring in Markdown you already have.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button size="sm" onClick={() => void actions.create(null)}>
              New page
            </Button>
            <Button size="sm" variant="outline" onClick={importMarkdown}>
              <UploadIcon data-icon="inline-start" />
              Import Markdown
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="pt-2">
          <PageList items={items} pages={pages} />
        </div>
      )}
    </div>
  )
}
