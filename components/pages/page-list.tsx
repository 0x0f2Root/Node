"use client"

import Link from "next/link"

import { TagList } from "@/components/tags/tag-badge"
import { pageHref, pagePath } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import { formatRelativeTime, useNow } from "@/lib/utils/time"
import { FileTextIcon, StarIcon } from "lucide-react"

export interface PageListItem {
  page: Page
  /** the time shown on the row: last opened, or last updated */
  date: Date
}

/** Compact rows of pages: title, location, time. */
export function PageList({
  items,
  pages,
}: {
  items: PageListItem[]
  /** every page, used to resolve each row's location */
  pages: Page[]
}) {
  const now = useNow()

  return (
    <ul className="-mx-2 flex flex-col">
      {items.map(({ page, date }) => (
        <li key={page.id}>
          <Link
            href={pageHref(page.id)}
            className="flex items-center gap-3 rounded-md px-2 py-2 outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <FileTextIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {pageTitle(page)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {pagePath(pages, page.id)}
              </span>
            </span>
            <TagList
              tags={page.tags}
              className="hidden max-w-[45%] shrink-0 flex-wrap items-center justify-end gap-1 sm:flex"
            />
            {page.favorite ? (
              <StarIcon
                className="size-3.5 shrink-0 fill-current text-muted-foreground"
                aria-label="Favorite"
              />
            ) : null}
            <time
              dateTime={date.toISOString()}
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {now ? formatRelativeTime(date, now) : ""}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  )
}
