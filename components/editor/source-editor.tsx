"use client"

import { useSourceText } from "@fumadocs-editor/ui"
import * as React from "react"

import { cn } from "@/lib/utils"

// A VS Code-style source surface for the editor's MDX tab, bound to the
// Fumadocs editor's own source state through useSourceText(): a line-number
// gutter and a highlight.js layer under a transparent textarea, with the
// three layers kept in scroll sync.
//
// The highlighter is a private instance — never highlight.js's shared one,
// which the Fumadocs editor consults to decide which fenced languages it
// knows; registering a language there would make it throw.

let highlighter: Promise<import("highlight.js").HLJSApi> | undefined

async function getHighlighter() {
  highlighter ??= (async () => {
    const core = (await import("highlight.js/lib/core")).default
    const markdown = (await import("highlight.js/lib/languages/markdown"))
      .default
    const instance = core.newInstance()
    instance.registerLanguage("markdown", markdown)
    return instance
  })()
  return highlighter
}

// Above this size highlighting is skipped so a very large document stays
// responsive; the plain textarea still edits it.
const MAX_HIGHLIGHT = 200_000
// Shared text metrics: the gutter, the highlight layer and the textarea must
// agree exactly or the caret drifts from the painted text.
const METRICS = "font-mono text-[13px] leading-6"

export function SourceEditor() {
  const { value, onChange, error, readOnly } = useSourceText()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const preRef = React.useRef<HTMLPreElement>(null)
  const gutterRef = React.useRef<HTMLDivElement>(null)

  // Keyed by the exact text it was produced from, so a stale highlight is
  // never shown over newer text while the next one computes.
  const [highlighted, setHighlighted] = React.useState<{
    code: string
    html: string
  } | null>(null)

  React.useEffect(() => {
    if (value.length > MAX_HIGHLIGHT) {
      return
    }
    let active = true
    getHighlighter()
      .then((instance) => {
        if (!active) {
          return
        }
        const html = instance.highlight(value, {
          language: "markdown",
          ignoreIllegals: true,
        }).value
        setHighlighted({ code: value, html })
      })
      .catch(() => {
        // Plain text is a fine fallback.
      })
    return () => {
      active = false
    }
  }, [value])

  const lineCount = React.useMemo(() => value.split("\n").length, [value])
  const numbers = React.useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1).join("\n"),
    [lineCount]
  )
  const html = highlighted?.code === value ? highlighted.html : null
  const gutterWidth = `${String(lineCount).length + 1}ch`

  function syncScroll() {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    if (preRef.current) {
      preRef.current.scrollTop = textarea.scrollTop
      preRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab indents by two spaces, like a code editor, instead of leaving the
    // field. Shift+Tab is left to move focus out, so keyboard users are not
    // trapped.
    if (event.key === "Tab" && !event.shiftKey && !readOnly) {
      event.preventDefault()
      const textarea = event.currentTarget
      const { selectionStart: start, selectionEnd: end } = textarea
      const next = value.slice(0, start) + "  " + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p
          role="status"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 font-mono text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div
        className="mdx-source flex h-[60vh] max-h-[80vh] min-h-80 resize-y overflow-hidden rounded-lg border bg-muted/30"
        data-fde-overlay=""
      >
        {/* Line numbers; scrolls vertically in step with the text. */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{ width: gutterWidth }}
          className={cn(
            METRICS,
            "shrink-0 overflow-hidden border-r bg-background/40 py-3 pr-2 text-right whitespace-pre text-muted-foreground/60 select-none"
          )}
        >
          {numbers}
        </div>

        <div className="relative min-w-0 flex-1">
          <pre
            ref={preRef}
            aria-hidden="true"
            className={cn(
              METRICS,
              "pointer-events-none absolute inset-0 overflow-hidden px-4 py-3 whitespace-pre text-foreground"
            )}
          >
            {html !== null ? (
              <code dangerouslySetInnerHTML={{ __html: `${html}\n` }} />
            ) : (
              <code>{`${value}\n`}</code>
            )}
          </pre>
          <textarea
            ref={textareaRef}
            value={value}
            readOnly={readOnly}
            onChange={(event) => onChange(event.target.value)}
            onScroll={syncScroll}
            onKeyDown={onKeyDown}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label="MDX source"
            className={cn(
              METRICS,
              "absolute inset-0 size-full resize-none overflow-auto bg-transparent px-4 py-3 whitespace-pre text-transparent caret-foreground outline-none selection:bg-primary/25"
            )}
          />
        </div>
      </div>
    </div>
  )
}
