import * as React from "react"
import Link from "next/link"

import { pageHref } from "@/lib/pages/tree"
import { pageTitle } from "@/lib/pages/types"
import type { SearchResult } from "@/lib/search/search"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Marks every occurrence of the query's terms in `text`. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp)
  if (terms.length === 0) {
    return text
  }
  const pattern = new RegExp(`(${terms.join("|")})`, "gi")

  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-xs bg-foreground/10 text-foreground">
        {part}
      </mark>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  )
}

/** Search hits: title, location, and the matching passage. */
export function SearchResults({
  results,
  query,
}: {
  results: SearchResult[]
  query: string
}) {
  return (
    <ol className="-mx-3 flex flex-col">
      {results.map(({ page, path, snippet }) => (
        <li key={page.id}>
          <Link
            href={pageHref(page.id)}
            className="flex flex-col gap-1 rounded-lg px-3 py-3 outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="text-sm font-medium">
              <Highlight text={pageTitle(page)} query={query} />
            </span>
            <span className="text-xs text-muted-foreground">{path}</span>
            {snippet ? (
              <span className="line-clamp-2 text-sm text-muted-foreground">
                <Highlight text={snippet} query={query} />
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ol>
  )
}
