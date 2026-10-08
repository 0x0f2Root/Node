"use client"

import * as React from "react"
import { toast } from "sonner"

import { runCopyLegacyPages } from "@/components/project/project-actions"
import {
  countLegacyPages,
  dismissLegacyImport,
  legacyImportPending,
} from "@/lib/pages/legacy-import"
import { usePagesState } from "@/lib/pages/store"

/**
 * Offers, once, to move pages from browser storage into data/pages/. Shown
 * after the tree has loaded so existing files are known and never replaced.
 */
export function LegacyImportPrompt() {
  const { status } = usePagesState()

  React.useEffect(() => {
    if (status !== "ready" || !legacyImportPending()) {
      return
    }
    const count = countLegacyPages()
    toast(
      `${count} ${count === 1 ? "page is" : "pages are"} stored in this browser`,
      {
        id: "legacy-import",
        description:
          "Node can migrate them to data/pages/ as Markdown files. Existing files are never replaced, and the browser copy is kept.",
        duration: Infinity,
        action: {
          label: "Migrate pages",
          onClick: () => void runCopyLegacyPages(),
        },
        cancel: { label: "Not now", onClick: dismissLegacyImport },
      }
    )
  }, [status])

  return null
}
