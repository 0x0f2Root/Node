"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
} from "recharts"

import { HtbLogo } from "@/components/home/htb-logo"
import { Badge } from "@/components/reui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { loadHtb, useHtb } from "@/lib/htb/store"
import type {
  HtbActivity,
  HtbData,
  HtbProgressRow,
  HtbSnapshot,
} from "@/lib/htb/types"
import { cn } from "@/lib/utils"
import { formatRelativeTime, useNow } from "@/lib/utils/time"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DropletIcon,
  ExternalLinkIcon,
  FlagIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
} from "lucide-react"

const WEEK_MS = 7 * 86_400_000

// Hack The Box green, darkened on light surfaces so it stays readable. Only
// this section uses it; everything else keeps Node's own palette.
const BRAND = "[--htb:#5c9400] dark:[--htb:#9fef00]"

function total(snapshot: HtbSnapshot) {
  return (
    snapshot.userOwns +
    snapshot.systemOwns +
    snapshot.challenges +
    snapshot.sherlocks
  )
}

/** The snapshot to compare today against: about a week back, if there is one. */
function baseline(history: HtbSnapshot[]): HtbSnapshot | null {
  if (history.length < 2) {
    return null
  }
  const latest = new Date(history[history.length - 1].day).getTime()
  const older = history.slice(0, -1)
  return (
    [...older]
      .reverse()
      .find((item) => latest - new Date(item.day).getTime() >= WEEK_MS) ??
    older[0]
  )
}

function Delta({
  value,
  lowerIsBetter = false,
}: {
  value: number
  /** for a ranking, a smaller number is the improvement */
  lowerIsBetter?: boolean
}) {
  if (!value) {
    return null
  }
  const better = lowerIsBetter ? value < 0 : value > 0
  const Icon = value > 0 ? ArrowUpIcon : ArrowDownIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs tabular-nums",
        better ? "text-(--htb)" : "text-muted-foreground"
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {Math.abs(value).toLocaleString()}
      <span className="sr-only"> since last week</span>
    </span>
  )
}

/** One of the four numbers that matter most. */
function Metric({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {children}
      </dd>
    </div>
  )
}

/** A supporting number: label and value on one line. */
function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {value.toLocaleString()}
      </dd>
    </div>
  )
}

function ProgressRows({
  title,
  rows,
}: {
  title: string
  rows: HtbProgressRow[]
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const share = row.total > 0 ? (row.owned / row.total) * 100 : 0
          return (
            <li key={row.name} className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className={cn(row.owned > 0 && "font-medium")}>
                    {row.owned}
                  </span>
                  <span className="text-muted-foreground"> / {row.total}</span>
                </span>
              </span>
              <span
                role="progressbar"
                aria-label={`${title}: ${row.name}`}
                aria-valuemin={0}
                aria-valuemax={row.total}
                aria-valuenow={row.owned}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-(--htb) transition-[width] duration-300"
                  // One solve out of hundreds should still be visible.
                  style={{
                    width: `${row.owned > 0 ? Math.max(share, 3) : 0}%`,
                  }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const categoryConfig = {
  owned: { label: "Solved", color: "var(--chart-1)" },
} satisfies ChartConfig

const trendConfig = {
  flags: { label: "Flags and challenges", color: "var(--htb)" },
} satisfies ChartConfig

function CategoryRadar({ rows }: { rows: HtbProgressRow[] }) {
  // The eight largest categories keep the chart readable.
  const data = [...rows].sort((a, b) => b.total - a.total).slice(0, 8)

  return (
    <ChartContainer
      config={categoryConfig}
      // Side labels may reach past the square chart into the card padding.
      className="mx-auto aspect-square max-h-[280px] w-full [&_svg]:overflow-visible"
    >
      {/* ReUI c-chart-23, with a slightly smaller radius so the category
          names fit inside the card. */}
      <RadarChart accessibilityLayer data={data} outerRadius="66%">
        <defs>
          <linearGradient id="htb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-owned)"
              stopOpacity={0.5}
            />
            <stop
              offset="100%"
              stopColor="var(--color-owned)"
              stopOpacity={0.08}
            />
          </linearGradient>
          <filter id="htb-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
        <PolarGrid strokeDasharray="3 3" />
        <Radar
          dataKey="owned"
          fill="url(#htb-fill)"
          stroke="var(--color-owned)"
          strokeWidth={2}
          filter="url(#htb-glow)"
          dot={{ r: 4, fill: "var(--color-owned)", strokeWidth: 0 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function Trend({ history }: { history: HtbSnapshot[] }) {
  if (history.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Node saves your numbers once a day, starting today. Come back tomorrow
        and the curve starts here.
      </p>
    )
  }
  const data = history.map((item) => ({
    day: item.day.slice(5),
    flags: total(item),
  }))
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-40 w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id="htb-trend" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-flags)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-flags)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="flags"
          type="monotone"
          fill="url(#htb-trend)"
          stroke="var(--color-flags)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function SolveIcon({ kind }: { kind: string }) {
  const Icon =
    kind === "machine"
      ? ServerIcon
      : kind === "sherlock"
        ? SearchIcon
        : FlagIcon
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  )
}

function solveDate(item: HtbActivity, now: number) {
  const date = new Date(item.date)
  if (Number.isNaN(date.getTime())) {
    return item.date
  }
  return now ? formatRelativeTime(date, now) : ""
}

function Solves({
  data,
  tokenConfigured,
  now,
}: {
  data: HtbData
  tokenConfigured: boolean
  now: number
}) {
  if (data.activity === null) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {tokenConfigured
          ? `The solve feed could not be read (${
              data.activityError ?? "unknown error"
            }). Check that the App Token is still valid in `
          : "HackTheBox lists individual solves only for a signed-in app. Add an App Token in "}
        <Link
          href="/settings#hackthebox"
          className="underline underline-offset-2"
        >
          Settings
        </Link>
        .
      </p>
    )
  }
  if (data.activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No solves yet. Your first flag will show up here.
      </p>
    )
  }
  return (
    <ul className="-my-1 flex flex-col divide-y">
      {data.activity.slice(0, 6).map((item, index) => (
        <li
          key={`${item.date}-${item.name}-${index}`}
          className="flex items-center gap-3 py-2.5"
        >
          <SolveIcon kind={item.kind} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{item.name}</span>
            <span className="truncate text-xs text-muted-foreground capitalize">
              {[item.kind, item.type].filter(Boolean).join(" · ") || "Solve"}
            </span>
          </span>
          {item.firstBlood ? (
            <Badge variant="destructive-light" size="sm">
              <DropletIcon />
              First blood
            </Badge>
          ) : null}
          {item.points ? (
            <span className="shrink-0 text-xs font-medium text-(--htb) tabular-nums">
              +{item.points}
            </span>
          ) : null}
          <time
            dateTime={item.date}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {solveDate(item, now)}
          </time>
        </li>
      ))}
    </ul>
  )
}

// Shaped like the loaded tracker, so nothing jumps when the numbers arrive.
function TrackerSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-3" aria-hidden="true">
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-12" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * A HackTheBox player at a glance. The rank and the road to the next one
 * lead; the four headline numbers follow; then where the owns are, how they
 * grew, and the latest solves.
 */
export function HtbTracker() {
  const { status, response } = useHtb()
  const now = useNow()

  if (!response) {
    return <TrackerSkeleton />
  }

  if (!response.profileId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-5">
        <HtbLogo className={cn("size-6 text-(--htb)", BRAND)} />
        <div>
          <p className="text-sm font-medium">Track your HackTheBox progress</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Rank, owns, challenge categories and your progress over time, from
            your public profile.
          </p>
        </div>
        <Link
          href="/settings#hackthebox"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Add your profile
        </Link>
      </div>
    )
  }

  const { data, history } = response
  if (!data) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-5"
      >
        <div>
          <p className="text-sm font-medium">HackTheBox could not be reached</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {response.error ?? "No answer from HackTheBox."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={status === "loading"}
          onClick={() => void loadHtb(true).catch(() => undefined)}
        >
          Try again
        </Button>
      </div>
    )
  }

  const { profile } = data
  const before = baseline(history)
  const latest = history[history.length - 1]
  const since = (pick: (snapshot: HtbSnapshot) => number | null) =>
    before && latest ? (pick(latest) ?? 0) - (pick(before) ?? 0) : 0
  const flags = profile.userOwns + profile.systemOwns
  const lastSolve = data.activity?.[0]

  function refresh() {
    loadHtb(true)
      .then(() => toast.success("HackTheBox numbers updated"))
      .catch(() => toast.error("HackTheBox could not be reached"))
  }

  return (
    <div className={cn("flex flex-col gap-4 pt-3", BRAND)}>
      <Card className="w-full gap-0 py-0">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 ring-2 ring-(--htb)/40">
              {profile.avatar ? (
                <AvatarImage src={profile.avatar} alt="" />
              ) : null}
              <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-base font-semibold tracking-tight">
                  {profile.name}
                </span>
                <Badge
                  variant="outline"
                  className="border-(--htb)/40 text-(--htb)"
                >
                  <HtbLogo className="size-3" />
                  {profile.rank}
                </Badge>
                {profile.team ? (
                  <Badge variant="outline">{profile.team}</Badge>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  profile.country,
                  profile.joined
                    ? `joined ${new Date(profile.joined).toLocaleDateString(
                        undefined,
                        { month: "short", year: "numeric" }
                      )}`
                    : null,
                  lastSolve && now
                    ? `last solve ${solveDate(lastSolve, now)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Update from HackTheBox"
                title={
                  response.fetchedAt && now
                    ? `Updated ${formatRelativeTime(
                        new Date(response.fetchedAt),
                        now
                      )}`
                    : undefined
                }
                disabled={status === "loading"}
                onClick={refresh}
              >
                <RefreshCwIcon
                  className={cn(status === "loading" && "animate-spin")}
                />
              </Button>
              <a
                href={`https://app.hackthebox.com/public/users/${profile.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the HackTheBox profile"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
              >
                <ExternalLinkIcon />
              </a>
            </div>
          </div>

          {response.error ? (
            <p className="text-xs text-muted-foreground" role="status">
              Showing the last numbers read ({response.error}).
            </p>
          ) : null}

          {profile.nextRank ? (
            <div className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">
                  Next rank:{" "}
                  <span className="font-medium text-foreground">
                    {profile.nextRank}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {profile.rankProgress}%
                </span>
              </span>
              <span
                role="progressbar"
                aria-label={`Progress to ${profile.nextRank}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={profile.rankProgress}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-(--htb) transition-[width] duration-300"
                  style={{ width: `${profile.rankProgress}%` }}
                />
              </span>
            </div>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
          <Metric
            label="Global ranking"
            value={
              profile.ranking ? `#${profile.ranking.toLocaleString()}` : "–"
            }
          >
            <Delta value={since((item) => item.ranking)} lowerIsBetter />
          </Metric>
          <Metric label="Points" value={profile.points.toLocaleString()}>
            <Delta value={since((item) => item.points)} />
          </Metric>
          <Metric label="Machine flags" value={flags.toLocaleString()}>
            <Delta value={since((item) => item.userOwns + item.systemOwns)} />
          </Metric>
          <Metric
            label="Challenges"
            value={data.challenges.owned.toLocaleString()}
          >
            <Delta value={since((item) => item.challenges)} />
          </Metric>
        </dl>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-muted/30 px-4 py-2.5">
          <Fact label="Tasks solved" value={data.tasks} />
          <Fact label="Sherlocks" value={data.sherlocks.owned} />
          <Fact label="First bloods" value={profile.bloods} />
          <Fact label="Respect" value={profile.respects} />
        </dl>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Machines</CardTitle>
            <CardDescription>
              {data.machines.owned} of {data.machines.total} owned
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ProgressRows title="Difficulty" rows={data.machineDifficulties} />
            <ProgressRows
              title="Operating system"
              rows={data.machineOs.filter(
                (row) => row.owned > 0 || row.total >= 100
              )}
            />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>
              {data.challenges.owned} of {data.challenges.total} solved
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CategoryRadar rows={data.challengeCategories} />
            <ProgressRows
              title="Difficulty"
              rows={data.challengeDifficulties}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Latest solves</CardTitle>
            <CardDescription>
              Flags and challenges, newest first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Solves
              data={data}
              tokenConfigured={response.tokenConfigured}
              now={now}
            />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Everything owned, day by day</CardDescription>
          </CardHeader>
          <CardContent>
            <Trend history={history} />
          </CardContent>
        </Card>
      </div>

      {data.badges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Badges</span>
          {data.badges.map((badge) => (
            <Badge key={badge.name} variant="outline" title={badge.description}>
              {badge.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
