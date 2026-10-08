"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { usePageParams } from "@/components/pages/use-page-params"
import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import {
  openWorkspaceDialog,
  startEditing,
} from "@/components/pages/tree-state"
import { exportPage, type ExportFormat } from "@/lib/markdown/files"
import {
  createPage,
  duplicatePage,
  ensureContent,
  getPages,
  uniqueTitle,
  updatePage,
} from "@/lib/pages/store"
import { idToPath } from "@/lib/pages/paths"
import { destinationFor, getAncestors, pageHref } from "@/lib/pages/tree"
import { DEFAULT_PAGE_TITLE, type Page } from "@/lib/pages/types"

function fail(title: string, error: unknown) {
  toast.error(title, {
    description: error instanceof Error ? error.message : undefined,
  })
}

/** Everything a menu, button or command can do to a page, folder or workspace. */
export function usePageActions() {
  const router = useRouter()
  const params = usePageParams()
  const { openDialog, setExpanded } = useWorkspaceUI()
  const currentId = params.pageId ?? null

  return React.useMemo(() => {
    /**
     * Creates a page or folder. With no explicit parent it goes where the
     * user is: the folder or workspace on screen, or the one holding the
     * open page. `inline` names it in the sidebar; otherwise it opens with
     * its title selected.
     */
    async function createIn(
      kind: "page" | "folder",
      parentId: string | null,
      inline: boolean
    ) {
      const destination = parentId ?? destinationFor(getPages(), currentId)
      if (destination === null) {
        // Nothing to put it in yet.
        openWorkspaceDialog({ mode: "create" })
        return
      }
      try {
        const created = await createPage({
          kind,
          parentId: destination,
          title: uniqueTitle(destination, DEFAULT_PAGE_TITLE),
        })
        setExpanded(destination, true)
        for (const ancestor of getAncestors(getPages(), destination)) {
          setExpanded(ancestor.id, true)
        }
        if (inline) {
          startEditing(created.id, true)
        } else {
          router.push(pageHref(created.id))
        }
      } catch (error) {
        fail(`Could not create the ${kind}`, error)
      }
    }

    return {
      open(id: string) {
        router.push(pageHref(id))
      },
      create(parentId: string | null = null, inline = false) {
        return createIn("page", parentId, inline)
      },
      createFolder(parentId: string | null = null, inline = false) {
        return createIn("folder", parentId, inline)
      },
      createWorkspace() {
        openWorkspaceDialog({ mode: "create" })
      },
      editWorkspace(id: string) {
        openWorkspaceDialog({ mode: "edit", id })
      },
      async duplicate(id: string) {
        try {
          const copy = await duplicatePage(id)
          router.push(pageHref(copy.id))
        } catch (error) {
          fail("Could not duplicate it", error)
        }
      },
      async toggleFavorite(page: Page) {
        try {
          await updatePage(page.id, { favorite: !page.favorite })
        } catch (error) {
          fail("Could not update favorites", error)
        }
      },
      /** `inline` renames in the sidebar tree instead of a dialog. */
      rename(id: string, inline = false) {
        if (inline) {
          startEditing(id)
        } else {
          openDialog({ type: "rename", pageId: id })
        }
      },
      move(id: string) {
        openDialog({ type: "move", pageId: id })
      },
      remove(id: string) {
        openDialog({ type: "delete", pageId: id })
      },
      copyLink(id: string) {
        void navigator.clipboard
          .writeText(`${window.location.origin}${pageHref(id)}`)
          .then(() => toast.success("Link copied"))
          .catch(() => toast.error("Could not copy the link"))
      },
      /** The file's location inside the project folder. */
      copyPath(id: string) {
        void navigator.clipboard
          .writeText(idToPath(id))
          .then(() => toast.success("Path copied"))
          .catch(() => toast.error("Could not copy the path"))
      },
      /** Opens the calendar's new-event dialog with this page linked. */
      addToCalendar(id: string) {
        router.push(`/calendar?page=${encodeURIComponent(id)}`)
      },
      async exportAs(page: Page, format: ExportFormat) {
        try {
          // The text may not have been read from its file yet.
          await ensureContent(page.id)
          exportPage(
            getPages().find((item) => item.id === page.id) ?? page,
            format
          )
        } catch (error) {
          fail("Export failed", error)
        }
      },
    }
  }, [router, currentId, openDialog, setExpanded])
}
