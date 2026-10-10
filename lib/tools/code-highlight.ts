// A private highlight.js instance for the Tools area, reusing the library
// already in the project (the same approach as the repository code viewer).
//
// It must NOT be highlight.js's shared instance: the document editor consults
// that shared instance to decide whether a code block's language is known and
// then highlights with its own smaller set, so registering a language there
// makes the editor throw. newInstance() keeps this separate.

type Grammar = { default: import("highlight.js").LanguageFn }

// One loader per language the shell catalog can emit. Loaded on first use.
const GRAMMARS: Record<string, () => Promise<Grammar>> = {
  awk: () => import("highlight.js/lib/languages/awk"),
  bash: () => import("highlight.js/lib/languages/bash"),
  groovy: () => import("highlight.js/lib/languages/groovy"),
  java: () => import("highlight.js/lib/languages/java"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  lua: () => import("highlight.js/lib/languages/lua"),
  perl: () => import("highlight.js/lib/languages/perl"),
  php: () => import("highlight.js/lib/languages/php"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  python: () => import("highlight.js/lib/languages/python"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
}

export function canHighlight(language: string): boolean {
  return language in GRAMMARS
}

let highlighter: Promise<import("highlight.js").HLJSApi> | undefined

/**
 * Highlights `code` as `language`, returning `<span class="hljs-…">` markup.
 * highlight.js escapes the source itself, so the returned HTML contains only
 * those spans around the original text — safe to insert. Returns null when
 * the language is unknown; the caller then shows plain text.
 */
export async function highlightCode(
  code: string,
  language: string
): Promise<string | null> {
  const load = GRAMMARS[language]
  if (!load) {
    return null
  }
  highlighter ??= import("highlight.js/lib/core").then((core) =>
    core.default.newInstance()
  )
  const hljs = await highlighter
  if (!hljs.getLanguage(language)) {
    hljs.registerLanguage(language, (await load()).default)
  }
  return hljs.highlight(code, { language, ignoreIllegals: true }).value
}
