"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { PageContextMenu } from "@/components/pages/page-context-menu"
import { PageMenuItems } from "@/components/pages/page-menu-items"
import { stopEditing, useTreeUI } from "@/components/pages/tree-state"
import { usePageActions } from "@/components/pages/use-page-actions"
import { WorkspaceIcon } from "@/components/pages/workspace-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@/components/ui/sidebar"
import { deletePage, uniqueTitle, updatePage } from "@/lib/pages/store"
import { pageHref, type PageNode } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import { cn } from "@/lib/utils"
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react"

// Row actions stay out of the way until the row is hovered, focused, or its
// menu is open. On touch widths they are always visible.
const ROW_ACTION =
  "group-hover/row:opacity-100 group-focus-within/row:opacity-100 aria-expanded:opacity-100 data-popup-open:opacity-100 md:opacity-0"

function ItemIcon({ page, open }: { page: Page; open: boolean }) {
  if (page.kind === "workspace") {
    return <WorkspaceIcon icon={page.icon} />
  }
  if (page.kind === "folder") {
    return open ? (
      <FolderOpenIcon aria-hidden="true" />
    ) : (
      <FolderIcon aria-hidden="true" />
    )
  }
  return <FileTextIcon aria-hidden="true" className="opacity-60" />
}

/**
 * The name field shown in place of a row: Enter or clicking away confirms,
 * Escape cancels. A row that was just created is removed again on Escape,
 * and a new page opens once it has its name.
 */
function InlineName({ page, creating }: { page: Page; creating: boolean }) {
  const router = useRouter()
  const input = React.useRef<HTMLInputElement>(null)
  const [value, setValue] = React.useState(page.title)
  const finished = React.useRef(false)
  // The menu that started this hands focus back to its trigger as it closes.
  // Taking focus a moment later, and ignoring blurs until then, keeps that
  // from confirming the name before anything was typed.
  const armed = React.useRef(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      input.current?.focus()
      input.current?.select()
      armed.current = true
    }, 80)
    return () => clearTimeout(timer)
  }, [])

  async function confirm() {
    if (finished.current) {
      return
    }
    finished.current = true
    stopEditing()
    const title = uniqueTitle(page.parentId, value, page.id)
    // Renaming gives the item a new id: its name is its file name.
    let id = page.id
    try {
      if (title !== page.title) {
        id = await updatePage(page.id, { title })
      }
    } catch {
      toast.error("Could not save the name")
    }
    if (creating && page.kind === "page") {
      router.push(pageHref(id))
    }
  }

  function cancel() {
    if (finished.current) {
      return
    }
    finished.current = true
    stopEditing()
    if (creating) {
      void deletePage(page.id).catch(() => undefined)
    }
  }

  return (
    <input
      ref={input}
      value={value}
      aria-label={`Name of the ${page.kind}`}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (armed.current) {
          void confirm()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          void confirm()
        } else if (event.key === "Escape") {
          event.preventDefault()
          cancel()
        }
      }}
      className="h-8 w-full rounded-md border border-sidebar-ring bg-background px-2 text-sm outline-none"
    />
  )
}

/** One row of the tree: a workspace, a folder or a page, and what it holds. */
export const PageTreeItem = React.memo(function PageTreeItem({
  node,
  activeId,
  activeTrail,
}: {
  node: PageNode
  activeId: string | null
  /** ids of the open item's ancestors: these rows start expanded */
  activeTrail: ReadonlySet<string>
}) {
  const { expanded, setExpanded } = useWorkspaceUI()
  const actions = usePageActions()
  const { isMobile, setOpenMobile } = useSidebar()
  const { editing } = useTreeUI()

  const { page, children } = node
  const title = pageTitle(page)
  const container = page.kind !== "page"
  // Workspaces start open; folders open along the path to the open item.
  const open =
    container &&
    (expanded[page.id] ??
      (page.kind === "workspace" ||
        activeTrail.has(page.id) ||
        page.id === activeId))
  const naming = editing?.id === page.id

  return (
    <SidebarMenuItem>
      {naming ? (
        <InlineName page={page} creating={editing.creating} />
      ) : (
        <PageContextMenu page={page} className="group/row relative" inline>
          <SidebarMenuButton
            isActive={page.id === activeId}
            className={cn(
              "pl-7",
              container
                ? "group-has-data-[sidebar=menu-action]/menu-item:pr-14"
                : "group-has-data-[sidebar=menu-action]/menu-item:pr-8",
              page.kind === "workspace" && "font-medium"
            )}
            render={
              <Link
                href={pageHref(page.id)}
                onClick={() => {
                  if (container) {
                    setExpanded(page.id, true)
                  }
                  if (isMobile) {
                    setOpenMobile(false)
                  }
                }}
              />
            }
          >
            <ItemIcon page={page} open={open} />
            <span>{title}</span>
          </SidebarMenuButton>

          {container ? (
            <button
              type="button"
              aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
              aria-expanded={open}
              onClick={() => setExpanded(page.id, !open)}
              className="absolute top-1.5 left-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/60 ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2"
            >
              <ChevronRightIcon
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  open && "rotate-90"
                )}
                aria-hidden="true"
              />
            </button>
          ) : null}

          {container ? (
            <SidebarMenuAction
              className={cn(ROW_ACTION, "right-7")}
              aria-label={`New page in ${title}`}
              onClick={() => void actions.create(page.id, true)}
            >
              <PlusIcon />
            </SidebarMenuAction>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuAction
                  className={ROW_ACTION}
                  aria-label={`Actions for ${title}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-52">
              <PageMenuItems
                page={page}
                Item={DropdownMenuItem}
                Separator={DropdownMenuSeparator}
                showOpen
                inlineRename
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </PageContextMenu>
      )}

      {open ? (
        <SidebarMenuSub className="mr-0 ml-3 pr-0 pl-1.5">
          {children.map((child) => (
            <PageTreeItem
              key={child.page.id}
              node={child}
              activeId={activeId}
              activeTrail={activeTrail}
            />
          ))}
          {children.length === 0 ? (
            <li className="px-2 py-1 text-xs text-sidebar-foreground/50">
              Empty
            </li>
          ) : null}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
})
