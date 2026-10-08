"use client"

import * as React from "react"

import { PageTreeItem } from "@/components/pages/page-tree-item"
import { usePageActions } from "@/components/pages/use-page-actions"
import { usePageParams } from "@/components/pages/use-page-params"
import { Button } from "@/components/ui/button"
import { SidebarMenu } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPages, usePagesState } from "@/lib/pages/store"
import { buildTree, getAncestors } from "@/lib/pages/tree"
import { PlusIcon } from "lucide-react"

const SKELETON_WIDTHS = ["w-32", "w-24", "w-36", "w-28", "w-20"]

export function PageTree() {
  const { status, pages, error } = usePagesState()
  const params = usePageParams()
  const actions = usePageActions()
  const activeId = params.pageId ?? null

  const tree = React.useMemo(() => buildTree(pages), [pages])
  const activeTrail = React.useMemo(
    () =>
      new Set(
        activeId ? getAncestors(pages, activeId).map((page) => page.id) : []
      ),
    [pages, activeId]
  )

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-col gap-3 px-2 py-2" aria-hidden="true">
        {SKELETON_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-3.5 ${width}`} />
        ))}
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-2 px-2 py-1.5">
        <p className="text-xs text-sidebar-foreground/70">
          {error ?? "The workspace could not be loaded."}
        </p>
        <Button variant="outline" size="xs" onClick={() => void loadPages()}>
          Try again
        </Button>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 px-2 py-1.5">
        <p className="text-xs text-sidebar-foreground/70">No workspaces yet.</p>
        <Button
          variant="outline"
          size="xs"
          onClick={() => actions.createWorkspace()}
        >
          <PlusIcon data-icon="inline-start" />
          New workspace
        </Button>
      </div>
    )
  }

  return (
    <SidebarMenu>
      {tree.map((node) => (
        <PageTreeItem
          key={node.page.id}
          node={node}
          activeId={activeId}
          activeTrail={activeTrail}
        />
      ))}
    </SidebarMenu>
  )
}
