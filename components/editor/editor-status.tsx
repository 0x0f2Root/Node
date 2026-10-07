"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { retrySave, useSaveState } from "@/lib/pages/save-status"
import { AlertCircleIcon, CheckIcon } from "lucide-react"

/** The open document's save state, kept quiet in the topbar. */
export function EditorStatus() {
  const state = useSaveState()

  return (
    <div
      role="status"
      aria-live="polite"
      className="mr-1 flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground"
    >
      {state === "saving" ? (
        <>
          <Spinner className="size-3" />
          <span>Saving…</span>
        </>
      ) : null}
      {state === "saved" ? (
        <>
          <CheckIcon className="size-3" aria-hidden="true" />
          <span>Saved</span>
        </>
      ) : null}
      {state === "unsaved" ? (
        <>
          <span
            className="size-1.5 rounded-full bg-muted-foreground/70"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Unsaved changes</span>
          <span className="sm:hidden">Unsaved</span>
        </>
      ) : null}
      {state === "error" ? (
        <>
          <AlertCircleIcon
            className="size-3 text-destructive"
            aria-hidden="true"
          />
          <span className="text-destructive">Error saving</span>
          <Button variant="outline" size="xs" onClick={retrySave}>
            Retry
          </Button>
        </>
      ) : null}
    </div>
  )
}
