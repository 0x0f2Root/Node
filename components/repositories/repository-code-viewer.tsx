"use client"

import * as React from "react"

// Above this size the text is shown plain: highlighting a very large file
// would block the page for no real benefit.
const MAX_HIGHLIGHT_CHARS = 300_000

type Grammar = { default: import("highlight.js").LanguageFn }

// One grammar per highlighter id used in lib/repositories/types.ts, each
// loaded only when a file in that language is opened.
const GRAMMARS: Record<string, () => Promise<Grammar>> = {
  bash: () => import("highlight.js/lib/languages/bash"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  css: () => import("highlight.js/lib/languages/css"),
  diff: () => import("highlight.js/lib/languages/diff"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  go: () => import("highlight.js/lib/languages/go"),
  ini: () => import("highlight.js/lib/languages/ini"),
  java: () => import("highlight.js/lib/languages/java"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  json: () => import("highlight.js/lib/languages/json"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  less: () => import("highlight.js/lib/languages/less"),
  lua: () => import("highlight.js/lib/languages/lua"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  php: () => import("highlight.js/lib/languages/php"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  python: () => import("highlight.js/lib/languages/python"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  rust: () => import("highlight.js/lib/languages/rust"),
  scss: () => import("highlight.js/lib/languages/scss"),
  sql: () => import("highlight.js/lib/languages/sql"),
  swift: () => import("highlight.js/lib/languages/swift"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  xml: () => import("highlight.js/lib/languages/xml"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
}

// A private highlighter. It must not be highlight.js's shared instance: the
// document editor consults that shared instance to decide whether a code
// block's language is known, then highlights with its own smaller set, so
// registering a language there makes the editor throw on it.
let highlighter: Promise<import("highlight.js").HLJSApi> | undefined

async function highlight(code: string, language: string): Promise<string> {
  const load = GRAMMARS[language]
  if (!load) {
    throw new Error(`No highlighter for ${language}`)
  }
  highlighter ??= import("highlight.js/lib/core").then((core) =>
    core.default.newInstance()
  )
  const hljs = await highlighter
  if (!hljs.getLanguage(language)) {
    hljs.registerLanguage(language, (await load()).default)
  }
  // The highlighter escapes the source itself and returns markup made only
  // of <span class="hljs-…"> around it, so the file's text is never
  // interpreted as HTML.
  return hljs.highlight(code, { language, ignoreIllegals: true }).value
}

/**
 * Read-only source: line numbers, syntax colours, horizontal scrolling. The
 * whole file is two text nodes (numbers and code), not a component per line,
 * so long files stay cheap and the browser's own find works across them.
 */
export function RepositoryCodeViewer({
  code,
  language,
}: {
  code: string
  /** highlighter id; plain text when absent */
  language?: string
}) {
  const [highlighted, setHighlighted] = React.useState<{
    code: string
    html: string
  } | null>(null)

  React.useEffect(() => {
    if (!language || code.length > MAX_HIGHLIGHT_CHARS) {
      return
    }
    let current = true
    highlight(code, language)
      .then((html) => {
        if (current) {
          setHighlighted({ code, html })
        }
      })
      .catch(() => {
        // Plain text is a fine fallback.
      })
    return () => {
      current = false
    }
  }, [code, language])

  const lineCount = React.useMemo(() => {
    const lines = code.split("\n").length
    return code.endsWith("\n") ? lines - 1 : lines
  }, [code])
  const numbers = React.useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1).join("\n"),
    [lineCount]
  )

  const html = highlighted?.code === code ? highlighted.html : null

  return (
    <div
      className="repo-code overflow-auto rounded-lg border bg-muted/30 font-mono text-[13px] leading-5"
      // Keyboard users can scroll a wide file.
      tabIndex={0}
      role="region"
      aria-label="File contents, read-only"
    >
      <div className="flex min-w-max">
        <pre
          aria-hidden="true"
          className="sticky left-0 shrink-0 border-r bg-background/80 px-3 py-3 text-right text-muted-foreground/70 select-none"
        >
          {numbers}
        </pre>
        <pre className="px-4 py-3">
          {html !== null ? (
            <code dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{code}</code>
          )}
        </pre>
      </div>
    </div>
  )
}
