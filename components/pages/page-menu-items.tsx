"use client"

import * as React from "react"

import { usePageActions } from "@/components/pages/use-page-actions"
import type { Page } from "@/lib/pages/types"
import {
  ArrowUpRightIcon,
  CalendarPlusIcon,
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  FileSymlinkIcon,
  FolderInputIcon,
  FolderPlusIcon,
  LinkIcon,
  PencilIcon,
  Settings2Icon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react"

type MenuItem = React.ComponentType<{
  onClick?: () => void
  variant?: "default" | "destructive"
  children?: React.ReactNode
}>

// One list of actions for a workspace, folder or page, rendered with
// whichever menu primitives the caller passes: the sidebar's context menu
// and the dropdown menus share it.
export function PageMenuItems({
  page,
  Item,
  Separator,
  showOpen = false,
  showExport = false,
  inlineRename = false,
}: {
  page: Page
  Item: MenuItem
  Separator: React.ComponentType<object>
  showOpen?: boolean
  /** page-only extras: calendar and export */
  showExport?: boolean
  /** create and rename in the sidebar tree (the caller is the tree) */
  inlineRename?: boolean
}) {
  const actions = usePageActions()
  const isPage = page.kind === "page"

  return (
    <>
      {!isPage ? (
        <>
          <Item onClick={() => void actions.create(page.id, inlineRename)}>
            <FilePlusIcon />
            New page
          </Item>
          <Item
            onClick={() => void actions.createFolder(page.id, inlineRename)}
          >
            <FolderPlusIcon />
            New folder
          </Item>
          <Separator />
        </>
      ) : null}
      {showOpen ? (
        <Item onClick={() => actions.open(page.id)}>
          <ArrowUpRightIcon />
          Open
        </Item>
      ) : null}
      <Item onClick={() => actions.rename(page.id, inlineRename)}>
        <PencilIcon />
        Rename
      </Item>
      <Item onClick={() => void actions.duplicate(page.id)}>
        <CopyIcon />
        Duplicate
      </Item>
      {isPage ? (
        <Item onClick={() => void actions.toggleFavorite(page)}>
          {page.favorite ? <StarOffIcon /> : <StarIcon />}
          {page.favorite ? "Remove from favorites" : "Favorite"}
        </Item>
      ) : null}
      {page.kind !== "workspace" ? (
        <Item onClick={() => actions.move(page.id)}>
          <FolderInputIcon />
          Move
        </Item>
      ) : null}
      {isPage ? (
        <Item onClick={() => actions.copyLink(page.id)}>
          <LinkIcon />
          Copy link
        </Item>
      ) : null}
      <Item onClick={() => actions.copyPath(page.id)}>
        <FileSymlinkIcon />
        Copy path
      </Item>
      {page.kind === "workspace" ? (
        <>
          <Separator />
          <Item onClick={() => actions.editWorkspace(page.id)}>
            <Settings2Icon />
            Workspace settings
          </Item>
        </>
      ) : null}
      {showExport && isPage ? (
        <>
          <Separator />
          <Item onClick={() => actions.addToCalendar(page.id)}>
            <CalendarPlusIcon />
            Add to Calendar
          </Item>
          <Item onClick={() => void actions.exportAs(page, "md")}>
            <DownloadIcon />
            Export Markdown
          </Item>
          <Item onClick={() => void actions.exportAs(page, "mdx")}>
            <DownloadIcon />
            Export MDX
          </Item>
        </>
      ) : null}
      <Separator />
      <Item variant="destructive" onClick={() => actions.remove(page.id)}>
        <Trash2Icon />
        Delete
      </Item>
    </>
  )
}
