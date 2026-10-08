"use client"

import * as React from "react"
import { toast } from "sonner"

import { savePage } from "@/lib/pages/save-status"
import { uniqueTitle } from "@/lib/pages/store"
import { DEFAULT_PAGE_TITLE, type Page } from "@/lib/pages/types"
import { formatRelativeTime, useNow } from "@/lib/utils/time"

function focusEditor() {
  // The live editor if it has mounted; otherwise its static first paint,
  // which starts the live editor when focused.
  const surface = document.querySelector(
    "[data-node-editor] [data-fde-overlay]"
  )
  const target =
    surface?.querySelector<HTMLElement>('[contenteditable="true"]') ??
    surface?.querySelector<HTMLElement>('[tabindex="0"]')
  target?.focus()
}

/**
 * The page title and its "Updated" line. The title is the name of the file
 * (or folder), so it is applied when the field is left rather than on every
 * keystroke; the document body below it belongs to the editor.
 */
export function DocumentHeader({ page }: { page: Page }) {
  const now = useNow()
  const [draft, setDraft] = React.useState<string | null>(null)

  async function commit() {
    if (draft === null) {
      return
    }
    const title = uniqueTitle(page.parentId, draft, page.id)
    if (title !== page.title && !(await savePage(page.id, { title }))) {
      toast.error("Could not rename it")
    }
    setDraft(null)
  }

  // "Untitled", or "Untitled (2)" when that name was taken.
  const isNew = page.title.startsWith(DEFAULT_PAGE_TITLE) && page.content === ""

  return (
    <header className="mb-4">
      <textarea
        rows={1}
        value={draft ?? page.title}
        placeholder={DEFAULT_PAGE_TITLE}
        aria-label="Page title"
        spellCheck={false}
        autoFocus={isNew}
        onFocus={(event) => {
          if (isNew) {
            event.currentTarget.select()
          }
        }}
        onChange={(event) => setDraft(event.target.value.replace(/\n/g, " "))}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "ArrowDown") {
            event.preventDefault()
            if (page.kind === "page") {
              focusEditor()
            } else {
              event.currentTarget.blur()
            }
          } else if (event.key === "Escape") {
            setDraft(null)
          }
        }}
        className="block field-sizing-content w-full resize-none overflow-hidden bg-transparent text-3xl leading-tight font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-[2.125rem]"
      />
      <p className="mt-2 min-h-4 text-xs text-muted-foreground">
        {now ? `Updated ${formatRelativeTime(page.updatedAt, now)}` : ""}
      </p>
    </header>
  )
}
