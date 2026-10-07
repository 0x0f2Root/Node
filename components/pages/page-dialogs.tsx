"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { deletePage, updatePage, usePagesState } from "@/lib/pages/store"
import { getDescendantIds, pagePath } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import { FileTextIcon } from "lucide-react"

function describe(error: unknown) {
  return error instanceof Error ? error.message : undefined
}

function RenameDialog({
  page,
  onClose,
}: {
  page: Page | undefined
  onClose: () => void
}) {
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!page) {
      return
    }
    const title = String(new FormData(event.currentTarget).get("title") ?? "")
    try {
      await updatePage(page.id, { title: title.trim() })
      onClose()
    } catch (error) {
      toast.error("Could not rename the page", { description: describe(error) })
    }
  }

  return (
    <Dialog
      open={page !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-sm">
        {page ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Rename page</DialogTitle>
              <DialogDescription className="sr-only">
                Enter a new title for {pageTitle(page)}.
              </DialogDescription>
            </DialogHeader>
            <Input
              name="title"
              defaultValue={page.title}
              placeholder="Untitled"
              aria-label="Page title"
              autoComplete="off"
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Rename</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function MoveDialog({
  page,
  pages,
  onClose,
}: {
  page: Page | undefined
  pages: Page[]
  onClose: () => void
}) {
  const { setExpanded } = useWorkspaceUI()

  // A page cannot move into itself or into anything nested under it.
  const blocked = page
    ? new Set([page.id, ...getDescendantIds(pages, page.id)])
    : new Set<string>()
  // Only workspaces and folders hold things.
  const targets = pages.filter(
    (candidate) => candidate.kind !== "page" && !blocked.has(candidate.id)
  )

  async function moveTo(parentId: string | null) {
    if (!page) {
      return
    }
    try {
      await updatePage(page.id, { parentId })
      if (parentId) {
        setExpanded(parentId, true)
      }
      onClose()
    } catch (error) {
      toast.error("Could not move the page", { description: describe(error) })
    }
  }

  return (
    <Dialog
      open={page !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {page ? (
          <>
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Move “{pageTitle(page)}”</DialogTitle>
              <DialogDescription>
                Choose where this page should live. Nested pages move with it.
              </DialogDescription>
            </DialogHeader>
            <Command className="rounded-none!">
              <CommandInput placeholder="Find a page…" />
              <CommandList>
                <CommandEmpty>No matching pages.</CommandEmpty>
                <CommandGroup>
                  {targets.map((target) => (
                    <CommandItem
                      key={target.id}
                      value={`${pageTitle(target)} ${target.id}`}
                      disabled={page.parentId === target.id}
                      onSelect={() => void moveTo(target.id)}
                    >
                      <FileTextIcon />
                      <span className="truncate">{pageTitle(target)}</span>
                      <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                        {page.parentId === target.id
                          ? "Current"
                          : pagePath(pages, target.id)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  page,
  pages,
  onClose,
}: {
  page: Page | undefined
  pages: Page[]
  onClose: () => void
}) {
  const router = useRouter()
  const params = useParams<{ pageId?: string }>()
  const [pending, setPending] = React.useState(false)

  const nested = page ? getDescendantIds(pages, page.id) : []

  async function onConfirm() {
    if (!page) {
      return
    }
    setPending(true)
    try {
      const removed = [page.id, ...nested]
      await deletePage(page.id)
      onClose()
      if (params.pageId && removed.includes(params.pageId)) {
        router.push("/workspace")
      }
    } catch (error) {
      toast.error("Could not delete the page", { description: describe(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={page !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        {page ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{pageTitle(page)}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {nested.length > 0
                  ? `This page and the ${nested.length} ${
                      nested.length === 1 ? "page" : "pages"
                    } nested under it will be permanently deleted.`
                  : "This page will be permanently deleted."}{" "}
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={() => void onConfirm()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** The rename, move and delete dialogs, driven by the workspace UI state. */
export function PageDialogs() {
  const { dialog, closeDialog } = useWorkspaceUI()
  const { pages } = usePagesState()

  const page = dialog
    ? pages.find((candidate) => candidate.id === dialog.pageId)
    : undefined

  return (
    <>
      <RenameDialog
        page={dialog?.type === "rename" ? page : undefined}
        onClose={closeDialog}
      />
      <MoveDialog
        page={dialog?.type === "move" ? page : undefined}
        pages={pages}
        onClose={closeDialog}
      />
      <DeleteDialog
        page={dialog?.type === "delete" ? page : undefined}
        pages={pages}
        onClose={closeDialog}
      />
    </>
  )
}
