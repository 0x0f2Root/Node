"use client"

import { toast } from "sonner"

import { usePageParams } from "@/components/pages/use-page-params"
import { AppBreadcrumbs } from "@/components/app-shell/breadcrumbs"
import { ThemeMenu } from "@/components/app-shell/theme-menu"
import { UserMenu } from "@/components/app-shell/user-menu"
import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { EditorStatus } from "@/components/editor/editor-status"
import { DocumentMenu } from "@/components/pages/document-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePagesState } from "@/lib/pages/store"
import { useModKey } from "@/lib/utils/client"
import { SearchIcon } from "lucide-react"

function SharePopover() {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy the link")
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" />
        }
      >
        Share
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Share this page</PopoverTitle>
          <PopoverDescription>
            Pages are stored in this browser, so this link opens the page only
            on this device. Export it as Markdown to send it to someone.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex gap-2">
          <Input
            readOnly
            aria-label="Page link"
            value={window.location.href}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button variant="outline" onClick={() => void copyLink()}>
            Copy
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function Topbar() {
  const params = usePageParams()
  const { pages } = usePagesState()
  const { setCommandOpen } = useWorkspaceUI()
  const modKey = useModKey()

  const page = params.pageId
    ? pages.find((candidate) => candidate.id === params.pageId)
    : undefined

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2 sm:px-3">
      <SidebarTrigger />
      <Separator
        orientation="vertical"
        className="mx-1.5 h-4 data-vertical:self-auto"
      />
      <AppBreadcrumbs />

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
        {page ? <EditorStatus /> : null}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Search"
                onClick={() => setCommandOpen(true)}
              />
            }
          >
            <SearchIcon />
          </TooltipTrigger>
          <TooltipContent side="bottom">Search · {modKey} K</TooltipContent>
        </Tooltip>
        {page ? <SharePopover /> : null}
        {page ? <DocumentMenu page={page} /> : null}
        <ThemeMenu />
        <UserMenu />
      </div>
    </header>
  )
}
