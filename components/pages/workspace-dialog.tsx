"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { closeWorkspaceDialog, useTreeUI } from "@/components/pages/tree-state"
import {
  DEFAULT_WORKSPACE_ICON,
  WORKSPACE_ICONS,
} from "@/components/pages/workspace-icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createPage,
  uniqueTitle,
  updatePage,
  usePagesState,
} from "@/lib/pages/store"
import { pageHref } from "@/lib/pages/tree"
import type { Page } from "@/lib/pages/types"
import { cn } from "@/lib/utils"

function WorkspaceForm({ workspace }: { workspace: Page | undefined }) {
  const router = useRouter()
  const { setExpanded } = useWorkspaceUI()
  const [name, setName] = React.useState(workspace?.title ?? "")
  const [description, setDescription] = React.useState(
    workspace?.description ?? ""
  )
  const [icon, setIcon] = React.useState(
    workspace?.icon ?? DEFAULT_WORKSPACE_ICON
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = name.trim()
    if (!title) {
      return
    }
    const details = { description: description.trim() || undefined, icon }
    try {
      if (workspace) {
        await updatePage(workspace.id, {
          title: uniqueTitle(null, title, workspace.id),
          ...details,
        })
        closeWorkspaceDialog()
        return
      }
      const created = await createPage({
        kind: "workspace",
        parentId: null,
        title: uniqueTitle(null, title),
        ...details,
      })
      setExpanded(created.id, true)
      closeWorkspaceDialog()
      router.push(pageHref(created.id))
    } catch (error) {
      toast.error("Could not save the workspace", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {workspace ? "Workspace settings" : "New workspace"}
        </DialogTitle>
        <DialogDescription>
          A workspace holds the folders and pages for one area of work.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Pentesting"
          autoComplete="off"
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspace-description">Description</Label>
        <Input
          id="workspace-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span id="workspace-icon-label" className="text-sm font-medium">
          Icon
        </span>
        <div
          role="radiogroup"
          aria-labelledby="workspace-icon-label"
          className="flex flex-wrap gap-1"
        >
          {WORKSPACE_ICONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={icon === option.id}
              aria-label={option.label}
              title={option.label}
              onClick={() => setIcon(option.id)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                icon === option.id && "border-border bg-muted text-foreground"
              )}
            >
              <option.icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={closeWorkspaceDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={name.trim() === ""}>
          {workspace ? "Save" : "Create workspace"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Create a workspace, or edit one's name, description and icon. */
export function WorkspaceDialog() {
  const { workspaceDialog } = useTreeUI()
  const { pages } = usePagesState()

  // Keep the last request rendered while the dialog animates closed.
  const [shown, setShown] = React.useState(workspaceDialog)
  if (workspaceDialog !== null && workspaceDialog !== shown) {
    setShown(workspaceDialog)
  }
  const current = workspaceDialog ?? shown
  const editingId = current?.mode === "edit" ? current.id : null

  return (
    <Dialog
      open={workspaceDialog !== null}
      onOpenChange={(open) => !open && closeWorkspaceDialog()}
    >
      <DialogContent className="sm:max-w-sm">
        {current ? (
          <WorkspaceForm
            key={editingId ?? "create"}
            workspace={pages.find((page) => page.id === editingId)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
