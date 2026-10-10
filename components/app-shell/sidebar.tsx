"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { PageContextMenu } from "@/components/pages/page-context-menu"
import { PageTree } from "@/components/pages/page-tree"
import { usePageActions } from "@/components/pages/use-page-actions"
import { usePageParams } from "@/components/pages/use-page-params"
import { runReload } from "@/components/project/project-actions"
import { RepositoryTree } from "@/components/repositories/repository-tree"
import { TagBadge } from "@/components/tags/tag-badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRecents } from "@/lib/pages/recents"
import { usePagesState } from "@/lib/pages/store"
import { pageHref, tagHref } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
// Tools in the sidebar show a soft IconTile around the PackageIcon glyph.
import { IconTile } from "@/components/reui/icon-tile"
import { TOOLS } from "@/lib/tools/registry"
import { cn } from "@/lib/utils"
import { useModKey } from "@/lib/utils/client"
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  FilePlusIcon,
  FolderPlusIcon,
  PackageIcon,
  RefreshCwIcon,
  PlusIcon,
  ClockIcon,
  HomeIcon,
  LayersIcon,
  SearchIcon,
  SettingsIcon,
  SquareKanbanIcon,
  SquarePenIcon,
  StarIcon,
} from "lucide-react"

const RECENT_LIMIT = 5

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
        <path d="M12 8.003 4.288 4.002 12 0l7.713 4v8.004L12 16v8l-7.71-4v-8L12 16V8.003Z" />
      </svg>
    </span>
  )
}

// A section that collapses from its own label: the label is rendered as the
// Collapsible trigger, which supplies aria-expanded and aria-controls.
function SidebarSection({
  label,
  action,
  children,
}: {
  label: string
  /** a control shown beside the section's collapse chevron */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup className="py-1">
        <SidebarGroupLabel
          render={<CollapsibleTrigger />}
          className="w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="min-w-0 flex-1 truncate text-start">{label}</span>
          <ChevronRightIcon
            className={cn(
              "ml-auto size-3.5! shrink-0 opacity-60 transition-transform duration-150",
              open && "rotate-90"
            )}
            aria-hidden="true"
          />
        </SidebarGroupLabel>
        {action ? (
          <div className="absolute top-2 right-9 flex items-center">
            {action}
          </div>
        ) : null}
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60">{children}</p>
  )
}

function PageLinks({
  pages,
  icon,
  activeId,
}: {
  pages: Page[]
  icon: React.ReactNode
  activeId: string | null
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      {pages.map((page) => (
        <SidebarMenuItem key={page.id}>
          <PageContextMenu page={page}>
            <SidebarMenuButton
              isActive={page.id === activeId}
              render={
                <Link
                  href={pageHref(page.id)}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false)
                    }
                  }}
                />
              }
            >
              {icon}
              <span>{pageTitle(page)}</span>
            </SidebarMenuButton>
          </PageContextMenu>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const params = usePageParams()
  const { setCommandOpen } = useWorkspaceUI()
  const { isMobile, setOpenMobile } = useSidebar()
  const actions = usePageActions()
  const { status, pages } = usePagesState()
  const recents = useRecents()
  const modKey = useModKey()

  const activeId = params.pageId ?? null
  const ready = status === "ready"
  const favorites = pages.filter(
    (page) => page.favorite && page.kind === "page"
  )
  const recentPages = recents
    .map((visit) => pages.find((page) => page.id === visit.id))
    .filter((page): page is Page => page !== undefined)
    .slice(0, RECENT_LIMIT)

  // Tags in use, most used first.
  const tagCounts = new Map<string, number>()
  for (const page of pages) {
    for (const tag of page.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }
  const tags = [...tagCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )

  function closeOnMobile() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    // The sidebar's border sits on its outer container, which is transparent
    // by default: a custom background would show through that one-pixel
    // column. Painting the container closes the seam.
    <Sidebar collapsible="offcanvas" className="bg-sidebar">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 pr-0.5 pl-1">
          <Link
            href="/"
            onClick={closeOnMobile}
            className="flex min-w-0 items-center gap-2 rounded-md ring-sidebar-ring outline-hidden focus-visible:ring-2"
          >
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight">Node</span>
          </Link>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label="New page"
                  onClick={() => {
                    closeOnMobile()
                    void actions.create(null)
                  }}
                />
              }
            >
              <SquarePenIcon />
            </TooltipTrigger>
            <TooltipContent side="bottom">New page</TooltipContent>
          </Tooltip>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                closeOnMobile()
                setCommandOpen(true)
              }}
            >
              <SearchIcon />
              <span className="flex-1">Search</span>
              <Kbd className="bg-sidebar-accent">{modKey} K</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/"}
              render={<Link href="/" onClick={closeOnMobile} />}
            >
              <HomeIcon />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/workspace"}
              render={<Link href="/workspace" onClick={closeOnMobile} />}
            >
              <LayersIcon />
              <span>All pages</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/calendar"}
              render={<Link href="/calendar" onClick={closeOnMobile} />}
            >
              <CalendarDaysIcon />
              <span>Calendar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/tasks"}
              render={<Link href="/tasks" onClick={closeOnMobile} />}
            >
              <SquareKanbanIcon />
              <span>Tasks</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent role="navigation" aria-label="Pages">
        <SidebarSection label="Favorites">
          {ready && favorites.length === 0 ? (
            <SectionHint>Star a page to keep it here.</SectionHint>
          ) : (
            <PageLinks
              pages={favorites}
              activeId={activeId}
              icon={<StarIcon className="text-sidebar-foreground/50" />}
            />
          )}
        </SidebarSection>

        <SidebarSection label="Recent">
          {ready && recentPages.length === 0 ? (
            <SectionHint>Pages you open will appear here.</SectionHint>
          ) : (
            <PageLinks
              pages={recentPages}
              activeId={activeId}
              icon={<ClockIcon className="text-sidebar-foreground/50" />}
            />
          )}
        </SidebarSection>

        <SidebarSection
          label="Workspaces"
          action={
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="New workspace, page or folder"
                className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/70 ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => actions.createWorkspace()}>
                  <LayersIcon />
                  New workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void actions.create(null, true)}
                >
                  <FilePlusIcon />
                  New page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void actions.createFolder(null, true)}
                >
                  <FolderPlusIcon />
                  New folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void runReload()}>
                  <RefreshCwIcon />
                  Reload from disk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <PageTree />
        </SidebarSection>

        <SidebarSection label="Tags">
          {ready && tags.length === 0 ? (
            <SectionHint>Tag a page under its title to group it.</SectionHint>
          ) : (
            <SidebarMenu>
              {tags.map(([tag, count]) => (
                <SidebarMenuItem key={tag}>
                  <SidebarMenuButton
                    render={
                      <Link href={tagHref(tag)} onClick={closeOnMobile} />
                    }
                  >
                    <TagBadge name={tag} className="max-w-40 truncate" />
                    <span className="ml-auto text-xs text-sidebar-foreground/50 tabular-nums">
                      {count}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarSection>

        <SidebarSection label="Tools">
          <SidebarMenu>
            {TOOLS.map((tool) => (
              <SidebarMenuItem key={tool.id}>
                <SidebarMenuButton
                  className="h-auto py-1.5"
                  isActive={
                    pathname === tool.href ||
                    pathname.startsWith(`${tool.href}/`)
                  }
                  render={<Link href={tool.href} onClick={closeOnMobile} />}
                >
                  <IconTile variant="soft" size="xs" aria-hidden="true">
                    <PackageIcon />
                  </IconTile>
                  <span>{tool.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarSection>

        <SidebarSection label="Repositories">
          <RepositoryTree />
        </SidebarSection>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/settings"}
              render={<Link href="/settings" onClick={closeOnMobile} />}
            >
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
