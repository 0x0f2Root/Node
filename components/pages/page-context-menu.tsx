"use client"

import * as React from "react"

import { PageMenuItems } from "@/components/pages/page-menu-items"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Page } from "@/lib/pages/types"

/** Wraps a sidebar row; right-clicking it opens the page's actions. */
export function PageContextMenu({
  page,
  className,
  inline = false,
  children,
}: {
  page: Page
  className?: string
  /** the row is in the tree, so create and rename happen in place */
  inline?: boolean
  children: React.ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className={className} />}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <PageMenuItems
          page={page}
          Item={ContextMenuItem}
          Separator={ContextMenuSeparator}
          inlineRename={inline}
          showOpen
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
