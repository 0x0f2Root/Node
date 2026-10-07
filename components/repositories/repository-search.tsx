"use client"

import * as React from "react"
import Link from "next/link"

import { BeamSearch } from "@/components/spectrumui/beam-search"
import { readAllFiles } from "@/lib/repositories/store"
import {
  repositoryHref,
  type RepositoryFile,
  type RepositorySource,
} from "@/lib/repositories/types"

const MAX_PATH_MATCHES = 20
const MAX_CONTENT_MATCHES = 40
const MAX_LINE_LENGTH = 160

interface ContentMatch {
  path: string
  line: number
  text: string
}

function searchContents(
  contents: Map<string, string>,
  needle: string
): ContentMatch[] {
  const matches: ContentMatch[] = []
  for (const [path, text] of contents) {
    // The first hit per file keeps the list readable.
    const index = text.toLowerCase().indexOf(needle)
    if (index < 0) {
      continue
    }
    const start = text.lastIndexOf("\n", index) + 1
    let end = text.indexOf("\n", index)
    if (end < 0) {
      end = text.length
    }
    const line = text.slice(0, start).split("\n").length
    matches.push({
      path,
      line,
      text: text.slice(start, end).trim().slice(0, MAX_LINE_LENGTH),
    })
    if (matches.length >= MAX_CONTENT_MATCHES) {
      break
    }
  }
  return matches
}

/** Search within one repository: file names and paths, then file contents. */
export function RepositorySearch({
  source,
  files,
  initialQuery = "",
  autoFocus = false,
}: {
  source: RepositorySource
  files: RepositoryFile[]
  initialQuery?: string
  autoFocus?: boolean
}) {
  const [query, setQuery] = React.useState(initialQuery)
  const deferred = React.useDeferredValue(query)
  const needle = deferred.trim().toLowerCase()
  const [contents, setContents] = React.useState<Map<string, string> | null>(
    null
  )

  // File contents are read from local storage the first time a search runs.
  const searching = needle.length > 0
  React.useEffect(() => {
    if (!searching) {
      return
    }
    let current = true
    readAllFiles(source.id)
      .catch(() => new Map<string, string>())
      .then((loaded) => current && setContents(loaded))
    return () => {
      current = false
    }
  }, [searching, source.id])

  const pathMatches = React.useMemo(
    () =>
      needle
        ? files
            .filter(
              (file) =>
                file.kind !== "directory" &&
                file.path.toLowerCase().includes(needle)
            )
            .slice(0, MAX_PATH_MATCHES)
        : [],
    [files, needle]
  )
  const contentMatches = React.useMemo(
    () => (needle && contents ? searchContents(contents, needle) : []),
    [contents, needle]
  )

  return (
    <div className="flex flex-col gap-4">
      <BeamSearch
        value={query}
        onChange={setQuery}
        placeholder={`Search ${source.name}…`}
        label={`Search ${source.name}`}
        autoFocus={autoFocus}
      />

      {searching ? (
        <div className="flex flex-col gap-5" aria-live="polite">
          {pathMatches.length === 0 &&
          contentMatches.length === 0 &&
          contents ? (
            <p className="text-sm text-muted-foreground">
              No files or text match “{deferred.trim()}”.
            </p>
          ) : null}

          {pathMatches.length > 0 ? (
            <section aria-label="Files">
              <h3 className="pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Files
              </h3>
              <ul className="-mx-2 flex flex-col">
                {pathMatches.map((file) => (
                  <li key={file.path}>
                    <Link
                      href={repositoryHref(source.id, file.path)}
                      className="block truncate rounded-md px-2 py-1.5 font-mono text-[13px] outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {file.path}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {contentMatches.length > 0 ? (
            <section aria-label="In files">
              <h3 className="pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                In files
              </h3>
              <ul className="-mx-2 flex flex-col">
                {contentMatches.map((match) => (
                  <li key={match.path}>
                    <Link
                      href={repositoryHref(source.id, match.path)}
                      className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span className="truncate font-mono text-[13px]">
                        {match.path}
                        <span className="text-muted-foreground">
                          :{match.line}
                        </span>
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {match.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
