"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-shell/sidebar"
import { Topbar } from "@/components/app-shell/topbar"
import { WorkspaceUIProvider } from "@/components/app-shell/workspace-ui"
import { CommandPalette } from "@/components/command/command-palette"
import { PageDialogs } from "@/components/pages/page-dialogs"
import { WorkspaceDialog } from "@/components/pages/workspace-dialog"
import { RepositoryImportDialog } from "@/components/repositories/repository-import-dialog"
import { WorkspaceBackground } from "@/components/theme/background-layer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useBackgroundConfig } from "@/lib/theme/background"
import { cn } from "@/lib/utils"

// The main column. With a custom background it turns transparent so the
// fixed background layer shows behind the page content; the sidebar and the
// topbar keep their own solid surfaces.
function Workspace({ children }: { children: React.ReactNode }) {
  const config = useBackgroundConfig()
  const custom = config.mode !== "none"

  return (
    <SidebarInset className={cn("min-w-0", custom && "isolate bg-transparent")}>
      <WorkspaceBackground />
      <Topbar />
      <main
        className="flex min-w-0 flex-1 flex-col"
        data-solid-content={custom && config.solidContent ? "" : undefined}
      >
        {children}
      </main>
    </SidebarInset>
  )
}

/**
 * The frame every route renders inside: sidebar, topbar, and the global UI
 * (command palette, page dialogs). Route content arrives as `children`, so
 * the pages themselves stay Server Components.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceUIProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "17rem" } as React.CSSProperties}
      >
        <AppSidebar />
        <Workspace>{children}</Workspace>
      </SidebarProvider>
      <CommandPalette />
      <PageDialogs />
      <WorkspaceDialog />
      <RepositoryImportDialog />
    </WorkspaceUIProvider>
  )
}
