"use client"

import * as React from "react"

import { SearchResults } from "@/components/search/search-results"
import { BeamSearch } from "@/components/spectrumui/beam-search"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPages, usePagesState } from "@/lib/pages/store"
import { searchPages } from "@/lib/search/search"
import { AlertCircleIcon, SearchXIcon } from "lucide-react"

/** Full-page search across titles, headings and body text. */
export function GlobalSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const { status, pages, error } = usePagesState()
  const [query, setQuery] = React.useState(initialQuery)
  const deferredQuery = React.useDeferredValue(query)

  const needle = deferredQuery.trim()
  const results = React.useMemo(
    () => searchPages(pages, needle, 50),
    [pages, needle]
  )
  const loading = status === "idle" || status === "loading"

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-10 pb-24 sm:px-8 md:pt-14">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>

      <BeamSearch
        className="mt-5"
        value={query}
        onChange={setQuery}
        placeholder="Search titles, headings and text…"
        label="Search pages"
        autoFocus
      />

      <div className="mt-6" aria-live="polite">
        {status === "error" ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertCircleIcon />
              </EmptyMedia>
              <EmptyTitle>Search is unavailable</EmptyTitle>
              <EmptyDescription>
                {error ?? "The workspace could not be read."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadPages()}
              >
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : loading ? (
          <div className="flex flex-col gap-6 py-3" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : !needle ? (
          <p className="py-3 text-sm text-muted-foreground">
            {pages.length === 0
              ? "There are no pages to search yet."
              : `Search across ${pages.length} ${
                  pages.length === 1 ? "page" : "pages"
                }.`}
          </p>
        ) : results.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>No results for “{needle}”</EmptyTitle>
              <EmptyDescription>
                Check the spelling, or try a shorter phrase.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <p className="pb-2 text-xs text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            <SearchResults results={results} query={needle} />
          </>
        )}
      </div>
    </div>
  )
}
