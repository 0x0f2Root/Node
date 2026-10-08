"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { DocumentHeader } from "@/components/editor/document-header"
import { ContainerOverview } from "@/components/pages/container-overview"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { recordVisit } from "@/lib/pages/recents"
import { clearUnsaved, markUnsaved, savePage } from "@/lib/pages/save-status"
import {
  ensureContent,
  getPages,
  loadPages,
  resolvePageId,
  setPageDirty,
  stablePageKey,
  usePagesState,
} from "@/lib/pages/store"
import { pageHref } from "@/lib/pages/tree"
import type { Page } from "@/lib/pages/types"
import { FONT_SIZE_PX, useEditorSettings } from "@/lib/settings/store"
import { cn } from "@/lib/utils"
import { AlertCircleIcon, FileQuestionIcon } from "lucide-react"

const AUTOSAVE_DELAY_MS = 700

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-hidden="true">
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

// The editor is client-only and the heaviest thing in the app, so it loads
// in its own chunk, after the shell and the page title are on screen.
const NodeEditor = dynamic(
  () => import("@/components/editor/node-editor").then((mod) => mod.NodeEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
)

/**
 * Debounced persistence around the editor: onChange hands over the
 * serialized Markdown/MDX, and after a pause it is written to the page's
 * file. Pending edits are flushed when the page is left or hidden.
 */
function useAutosave(pageId: string) {
  const pending = React.useRef<string | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = React.useCallback(async () => {
    clearTimeout(timer.current)
    const content = pending.current
    if (content === null) {
      return
    }
    pending.current = null
    clearUnsaved()
    const current = getPages().find((page) => page.id === resolvePageId(pageId))
    if (!current || current.loaded === false) {
      // Gone, or being read from disk again: these edits were given up.
      return
    }
    const saved = await savePage(pageId, { content })
    if (saved && pending.current === null) {
      setPageDirty(pageId, false)
    }
  }, [pageId])

  const onChange = React.useCallback(
    (content: string) => {
      const current = getPages().find(
        (page) => page.id === resolvePageId(pageId)
      )
      if (!current) {
        return
      }
      // The editor can report a document identical to what is stored.
      if (pending.current === null && current.content === content) {
        return
      }
      pending.current = content
      setPageDirty(pageId, true)
      markUnsaved()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS)
    },
    [pageId, flush]
  )

  React.useEffect(() => {
    const onHide = () => void flush()
    window.addEventListener("pagehide", onHide)
    return () => {
      window.removeEventListener("pagehide", onHide)
      void flush()
    }
  }, [flush])

  return onChange
}

function EditorSurface({ page }: { page: Page }) {
  // Read once: the editor is uncontrolled, so later saves must not flow back.
  const [source] = React.useState(page.content)
  const onChange = useAutosave(page.id)

  return (
    <div data-node-editor="">
      <NodeEditor pageId={page.id} source={source} onChange={onChange} />
    </div>
  )
}

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }
    return (
      <StateMessage
        icon={<AlertCircleIcon />}
        title="The editor ran into a problem"
        description="Your Markdown file is intact. Reload the editor, or open the file in another program."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => this.setState({ failed: false })}
        >
          Reload editor
        </Button>
      </StateMessage>
    )
  }
}

function StateMessage({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  )
}

/** The document view: page header, then the editor, with autosave. */
export function EditorShell({ pageId }: { pageId: string }) {
  const { status, pages, error } = usePagesState()
  const settings = useEditorSettings()

  // A page's id is its path. After a rename or move the address in the URL
  // is the old one: keep showing the page and move the URL along.
  const currentId = resolvePageId(pageId)
  const page = pages.find((candidate) => candidate.id === currentId)
  // Only documents count as "recently opened"; folders are not visits.
  const exists = page?.kind === "page"
  const unread = exists && page.loaded === false

  React.useEffect(() => {
    if (currentId !== pageId) {
      // Not a navigation: that would restart the editor mid-sentence.
      window.history.replaceState(null, "", pageHref(currentId))
    }
  }, [currentId, pageId])

  React.useEffect(() => {
    if (exists) {
      recordVisit(currentId)
    }
  }, [exists, currentId])

  React.useEffect(() => {
    if (unread) {
      void ensureContent(currentId).catch(() => undefined)
    }
  }, [unread, currentId])

  const frame = cn(
    "mx-auto w-full px-6 pt-10 pb-40 sm:px-10 md:pt-14",
    settings.editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-[52rem]"
  )

  if (status === "idle" || status === "loading") {
    return (
      <div className={frame} aria-busy="true">
        <Skeleton className="mb-3 h-9 w-2/5" />
        <Skeleton className="mb-8 h-3 w-28" />
        <EditorSkeleton />
      </div>
    )
  }

  if (status === "error") {
    return (
      <StateMessage
        icon={<AlertCircleIcon />}
        title="This page could not be loaded"
        description={error ?? "The project folder could not be read."}
      >
        <Button variant="outline" size="sm" onClick={() => void loadPages()}>
          Try again
        </Button>
      </StateMessage>
    )
  }

  if (!page) {
    return (
      <StateMessage
        icon={<FileQuestionIcon />}
        title="Page not found"
        description="Its file may have been renamed, moved or deleted outside Node."
      >
        <Link
          href="/workspace"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to all pages
        </Link>
      </StateMessage>
    )
  }

  // A workspace or folder opens as an overview of what it holds.
  if (page.kind !== "page") {
    return (
      <div className={frame}>
        <ContainerOverview container={page} pages={pages} />
      </div>
    )
  }

  return (
    <article
      className={frame}
      style={
        {
          "--fde-font-size": `${FONT_SIZE_PX[settings.fontSize]}px`,
        } as React.CSSProperties
      }
    >
      <DocumentHeader page={page} />
      {unread ? (
        <EditorSkeleton />
      ) : (
        // Keyed by an identity that survives a rename, so retitling a page
        // does not restart the editor under the cursor.
        <EditorErrorBoundary key={stablePageKey(page.id)}>
          <EditorSurface key={stablePageKey(page.id)} page={page} />
        </EditorErrorBoundary>
      )}
    </article>
  )
}
