"use client"

import * as React from "react"
import Link from "next/link"

import { DocumentHeader } from "@/components/editor/document-header"
import { PageList, type PageListItem } from "@/components/pages/page-list"
import { usePageActions } from "@/components/pages/use-page-actions"
import { WorkspaceIcon } from "@/components/pages/workspace-icon"
import { Button } from "@/components/ui/button"
import { buildTree, getDescendantIds, pageHref } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import { useTasks } from "@/lib/tasks/tasks"
import {
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  SquarePenIcon,
} from "lucide-react"

const RECENT_LIMIT = 5

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

/**
 * What a workspace or folder shows when opened: its name, what it holds,
 * and the pages most recently worked on inside it.
 */
export function ContainerOverview({
  container,
  pages,
}: {
  container: Page
  pages: Page[]
}) {
  const actions = usePageActions()
  const tasks = useTasks()

  const { children, inside } = React.useMemo(() => {
    const ids = new Set(getDescendantIds(pages, container.id))
    const subtree = pages.filter((page) => ids.has(page.id))
    return {
      inside: subtree,
      // Direct contents, in the same order as the sidebar.
      children: buildTree(
        subtree.map((page) =>
          page.parentId === container.id ? { ...page, parentId: null } : page
        )
      ).map((node) => node.page),
    }
  }, [pages, container.id])

  const documents = inside.filter((page) => page.kind === "page")
  const folderCount = inside.length - documents.length
  const taskCount = tasks.filter(
    (task) =>
      task.pageId === container.id ||
      inside.some((page) => page.id === task.pageId)
  ).length
  const recent = [...documents]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map((page): PageListItem => ({ page, date: page.updatedAt }))

  const create = (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => void actions.create(container.id)}>
        <SquarePenIcon data-icon="inline-start" />
        New page
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void actions.createFolder(container.id)}
      >
        <FolderPlusIcon data-icon="inline-start" />
        New folder
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          {container.kind === "workspace" ? (
            <WorkspaceIcon icon={container.icon} className="size-4" />
          ) : (
            <FolderIcon className="size-4" aria-hidden="true" />
          )}
          {container.kind === "workspace" ? "Workspace" : "Folder"}
        </p>
        <DocumentHeader page={container} />
        {container.description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {container.description}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {[
            plural(documents.length, "page"),
            plural(folderCount, "folder"),
            taskCount > 0 ? plural(taskCount, "task") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <div>
            <p className="text-sm font-medium">
              This {container.kind} is empty
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create your first technical note, or a folder to group them.
            </p>
          </div>
          {create}
        </div>
      ) : (
        <>
          {create}
          <section aria-label="Contents" className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Contents
            </h2>
            <ul className="divide-y rounded-lg border">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={pageHref(child.id)}
                    className="flex items-center gap-3 px-3 py-2 text-sm outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {child.kind === "page" ? (
                      <FileTextIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <FolderIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {pageTitle(child)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {recent.length > 0 ? (
            <section aria-label="Recent" className="flex flex-col gap-1">
              <h2 className="border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Recently updated
              </h2>
              <PageList items={recent} pages={pages} />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
