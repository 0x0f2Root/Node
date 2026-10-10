import { pagePath } from "@/lib/pages/tree"
import type { Page } from "@/lib/pages/types"

export interface SearchResult {
  page: Page
  /** "Workspace / Engineering" */
  path: string
  snippet: string
  score: number
}

const SNIPPET_RADIUS = 70

/** Markdown/MDX source reduced to the text a reader would see. */
export function toPlainText(source: string): string {
  return source
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .replace(/^```.*$/gm, "")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/^\s*\[[ xX]\]\s+/gm, "")
    .replace(/^\|?[\s:|-]+\|[\s:|-]*$/gm, "")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function headings(source: string): string {
  return (source.match(/^#{1,6}\s+.*$/gm) ?? []).join(" ").toLowerCase()
}

function snippetAround(text: string, index: number, length: number): string {
  if (index < 0) {
    return text.length > SNIPPET_RADIUS * 2
      ? `${text.slice(0, SNIPPET_RADIUS * 2).trimEnd()}…`
      : text
  }
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS)
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${
    end < text.length ? "…" : ""
  }`
}

/**
 * Searches titles, headings and body text. Every term must appear somewhere
 * in the page; title matches rank above heading matches, which rank above
 * matches in the body.
 */
export function searchPages(
  pages: Page[],
  query: string,
  limit = 20
): SearchResult[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return []
  }
  const terms = needle.split(/\s+/)
  const results: SearchResult[] = []

  for (const page of pages) {
    const title = page.title.toLowerCase()
    const text = toPlainText(page.content)
    const lowerText = text.toLowerCase()
    const tags = (page.tags ?? []).join(" ").toLowerCase()

    if (
      !terms.every(
        (term) =>
          title.includes(term) ||
          lowerText.includes(term) ||
          tags.includes(term)
      )
    ) {
      continue
    }

    const pageHeadings = headings(page.content)
    let score = 0
    if (title === needle) {
      score += 120
    } else if (title.startsWith(needle)) {
      score += 90
    } else if (title.includes(needle)) {
      score += 70
    }
    for (const term of terms) {
      if (title.includes(term)) {
        score += 20
      }
      if (tags.includes(term)) {
        score += 30
      }
      if (pageHeadings.includes(term)) {
        score += 10
      }
      if (lowerText.includes(term)) {
        score += 4
      }
    }

    const phraseIndex = lowerText.indexOf(needle)
    const index =
      phraseIndex >= 0 ? phraseIndex : lowerText.indexOf(terms[0] ?? needle)
    const length = phraseIndex >= 0 ? needle.length : (terms[0]?.length ?? 0)

    results.push({
      page,
      path: pagePath(pages, page.id),
      snippet: snippetAround(text, index, length),
      score,
    })
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.page.updatedAt.getTime() - a.page.updatedAt.getTime()
    )
    .slice(0, limit)
}
