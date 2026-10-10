"use client"

import * as React from "react"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { ActivityTracker } from "@/components/home/activity-tracker"
import { HtbLogo } from "@/components/home/htb-logo"
import { HtbTracker } from "@/components/home/htb-tracker"
import { SkillAssessment } from "@/components/home/skill-assessment"
import { PageList, type PageListItem } from "@/components/pages/page-list"
import { usePageActions } from "@/components/pages/use-page-actions"
import { RecentActivity } from "@/components/spectrumui/recent-activity"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecents } from "@/lib/pages/recents"
import { loadPages, usePagesState } from "@/lib/pages/store"
import { pageHref, pagePath } from "@/lib/pages/tree"
import { pageTitle } from "@/lib/pages/types"
import { useEditorSettings } from "@/lib/settings/store"
import { cn } from "@/lib/utils"
import { formatCompactTime, greeting, useNow } from "@/lib/utils/time"
import {
  ClockIcon,
  FileTextIcon,
  SquarePenIcon,
  UploadIcon,
} from "lucide-react"

const RECENT_LIMIT = 6

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string
  title: string
  /** a small mark shown before the title */
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <h2
        id={`${id}-heading`}
        className="flex items-center gap-1.5 border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {icon}
        {title}
      </h2>
      <div className="pt-2">{children}</div>
    </section>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  )
}

/** Home: a greeting, then where you were and what you starred. */
export function HomeView() {
  const { status, pages, error } = usePagesState()
  const recents = useRecents()
  const actions = usePageActions()
  const { importMarkdown } = useWorkspaceUI()
  const now = useNow()
  const { editorWidth } = useEditorSettings()

  const loading = status === "idle" || status === "loading"

  const recentItems = recents
    .map((visit): PageListItem | null => {
      const page = pages.find((candidate) => candidate.id === visit.id)
      return page ? { page, date: new Date(visit.at) } : null
    })
    .filter((item): item is PageListItem => item !== null)
    .slice(0, RECENT_LIMIT)

  const favoriteItems = pages
    .filter((page) => page.favorite)
    .map((page): PageListItem => ({ page, date: page.updatedAt }))

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-10 px-5 pt-10 pb-24 sm:px-8 md:pt-16",
        // Home follows the same Page width setting as documents.
        editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-2xl"
      )}
    >
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {now ? greeting(now) : "Welcome back"}
          </h1>
          <p className="mt-1 min-h-5 text-sm text-muted-foreground">
            {now
              ? new Date(now).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void actions.create(null)}>
            <SquarePenIcon data-icon="inline-start" />
            New page
          </Button>
          <Button size="sm" variant="outline" onClick={importMarkdown}>
            <UploadIcon data-icon="inline-start" />
            Import Markdown
          </Button>
        </div>
      </header>

      {status === "error" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            {error ?? "The workspace could not be loaded."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void loadPages()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <Section id="activity" title="Activity">
            <ActivityTracker />
          </Section>

          <Section
            id="hackthebox"
            title="HackTheBox"
            icon={
              <HtbLogo className="size-3.5 text-[#6aa800] dark:text-[#9fef00]" />
            }
          >
            <HtbTracker />
          </Section>

          <Section id="skills" title="Skills">
            {loading ? <ListSkeleton /> : <SkillAssessment pages={pages} />}
          </Section>

          {loading || recentItems.length === 0 ? (
            <Section id="recent" title="Recent">
              {loading ? (
                <ListSkeleton />
              ) : (
                <Hint>
                  {pages.length === 0
                    ? "Your workspace is empty. Create a page to start writing."
                    : "Pages you open will appear here."}
                </Hint>
              )}
            </Section>
          ) : (
            <section id="recent" aria-label="Recent" className="scroll-mt-20">
              <RecentActivity
                title="Recent"
                titleIcon={<ClockIcon />}
                items={recentItems.map(({ page, date }) => ({
                  id: page.id,
                  href: pageHref(page.id),
                  icon: <FileTextIcon />,
                  title: pageTitle(page),
                  description: pagePath(pages, page.id),
                  timeAgo: now ? formatCompactTime(date, now) : undefined,
                }))}
              />
            </section>
          )}

          <Section id="favorites" title="Favorites">
            {loading ? (
              <ListSkeleton />
            ) : favoriteItems.length === 0 ? (
              <Hint>Star a page from its menu to keep it within reach.</Hint>
            ) : (
              <PageList items={favoriteItems} pages={pages} />
            )}
          </Section>
        </>
      )}
    </div>
  )
}
