"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { canHighlight, highlightCode } from "@/lib/tools/code-highlight"
import { cn } from "@/lib/utils"
import { CheckIcon, CopyIcon } from "lucide-react"

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    toast.error("Could not copy", {
      description:
        "The browser blocked clipboard access. Select the text and copy it instead.",
    })
    return false
  }
}

/**
 * A read-only, syntax-highlighted code block for the Tools area, reusing the
 * project's highlight.js setup. The command is rendered as text (highlight.js
 * escapes it and emits only `hljs-*` spans), never as live markup, and the
 * tool never runs it. Long commands scroll sideways; whitespace is kept.
 */
export function ToolCodeBlock({
  code,
  language,
  label,
  className,
}: {
  code: string
  /** highlight.js language id; shown as the block's label unless `label` is set */
  language: string
  label?: string
  className?: string
}) {
  // Keyed by the exact code+language it was produced from, so a stale result
  // from a previous value is never shown while the new one is computing.
  const [highlighted, setHighlighted] = React.useState<{
    key: string
    html: string
  } | null>(null)
  const [copied, setCopied] = React.useState(false)
  const key = `${language}\u0000${code}`

  React.useEffect(() => {
    if (!canHighlight(language)) {
      return
    }
    let active = true
    highlightCode(code, language)
      .then((result) => {
        if (active && result !== null) {
          setHighlighted({ key: `${language}\u0000${code}`, html: result })
        }
      })
      .catch(() => {
        // Plain text is a fine fallback.
      })
    return () => {
      active = false
    }
  }, [code, language])

  const html = highlighted?.key === key ? highlighted.html : null

  React.useEffect(() => {
    if (!copied) {
      return
    }
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function onCopy() {
    if (await copyText(code)) {
      setCopied(true)
      toast.success("Copied to clipboard")
    }
  }

  return (
    <div
      className={cn(
        "tool-code group/code overflow-hidden rounded-lg border bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 py-1 pr-1 pl-3">
        <span className="font-mono text-[0.6875rem] tracking-wide text-muted-foreground">
          {label ?? language}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="ml-auto text-muted-foreground"
          aria-label="Copy command"
          onClick={() => void onCopy()}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" className="text-success" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        tabIndex={0}
        className="overflow-x-auto px-3 py-2.5 font-mono text-[0.8125rem] leading-relaxed whitespace-pre"
      >
        {html !== null ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}
