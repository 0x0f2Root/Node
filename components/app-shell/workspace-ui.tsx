"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { IMPORT_ACCEPT, readMarkdownFile } from "@/lib/markdown/files"
import {
  createPage,
  getPages,
  onPagesRelocated,
  uniqueTitle,
} from "@/lib/pages/store"
import { destinationFor, pageHref } from "@/lib/pages/tree"
import type { Page } from "@/lib/pages/types"

export interface PageDialog {
  type: "rename" | "move" | "delete"
  pageId: string
}

// UI state only: what is open, what is expanded. Documents live in the pages
// store and save state in its own store.
interface WorkspaceUI {
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  dialog: PageDialog | null
  openDialog: (dialog: PageDialog) => void
  closeDialog: () => void
  /** explicit open/closed choices for page tree rows, by page id */
  expanded: Record<string, boolean>
  setExpanded: (pageId: string, open: boolean) => void
  /** opens the file picker and imports the chosen Markdown files */
  importMarkdown: () => void
}

const WorkspaceUIContext = React.createContext<WorkspaceUI | null>(null)

export function useWorkspaceUI(): WorkspaceUI {
  const context = React.useContext(WorkspaceUIContext)
  if (!context) {
    throw new Error("useWorkspaceUI must be used inside WorkspaceUIProvider.")
  }
  return context
}

export function WorkspaceUIProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [dialog, setDialog] = React.useState<PageDialog | null>(null)
  const [expanded, setExpandedState] = React.useState<Record<string, boolean>>(
    {}
  )
  const fileInput = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return
      }
      const key = event.key.toLowerCase()
      if ((key === "k" && !event.shiftKey) || (key === "p" && event.shiftKey)) {
        event.preventDefault()
        // Leave the editor at once, so keys typed while the palette is still
        // mounting cannot land in the document.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        setCommandOpen((open) => !open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Renaming or moving a folder changes its id; open rows stay open.
  React.useEffect(
    () =>
      onPagesRelocated((remap) =>
        setExpandedState((current) =>
          Object.fromEntries(
            Object.entries(current).map(([id, open]) => [remap(id), open])
          )
        )
      ),
    []
  )

  const closeDialog = React.useCallback(() => setDialog(null), [])

  const setExpanded = React.useCallback((pageId: string, open: boolean) => {
    setExpandedState((current) => ({ ...current, [pageId]: open }))
  }, [])

  const importMarkdown = React.useCallback(() => {
    fileInput.current?.click()
  }, [])

  async function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    let imported = 0
    let last: Page | null = null
    for (const file of files) {
      try {
        const { title, content } = await readMarkdownFile(file)
        // Into the first workspace; a name already in use gets a number.
        const parentId = destinationFor(getPages(), null)
        last = await createPage({
          parentId,
          title: uniqueTitle(parentId, title),
          content,
        })
        imported += 1
      } catch (error) {
        toast.error("Import failed", {
          description:
            error instanceof Error
              ? error.message
              : `Could not read ${file.name}.`,
        })
      }
    }

    if (last) {
      router.push(pageHref(last.id))
      if (imported > 1) {
        toast.success(`${imported} pages imported`)
      }
    }
  }

  const value = React.useMemo<WorkspaceUI>(
    () => ({
      commandOpen,
      setCommandOpen,
      dialog,
      openDialog: setDialog,
      closeDialog,
      expanded,
      setExpanded,
      importMarkdown,
    }),
    [commandOpen, dialog, closeDialog, expanded, setExpanded, importMarkdown]
  )

  return (
    <WorkspaceUIContext.Provider value={value}>
      {children}
      <input
        ref={fileInput}
        type="file"
        accept={IMPORT_ACCEPT}
        multiple
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFilesChosen}
      />
    </WorkspaceUIContext.Provider>
  )
}
