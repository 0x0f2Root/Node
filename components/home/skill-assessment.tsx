"use client"

import * as React from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"

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
import type { Page } from "@/lib/pages/types"
import { useNow } from "@/lib/utils/time"

// A radar needs at least three axes to have a shape, and gets unreadable
// past eight.
const MIN_SKILLS = 3
const MAX_SKILLS = 8
const RECENT_DAYS = 30
const DAY_MS = 86_400_000

// Long tag names would run off the card; the tooltip shows them in full.
function shortLabel(name: string) {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name
}

const totalConfig = {
  pages: { label: "Pages", color: "var(--chart-1)" },
} satisfies ChartConfig

const recentConfig = {
  recent: { label: "Pages", color: "var(--chart-2)" },
} satisfies ChartConfig

/**
 * What the notes say you have been practising. Every tag is a skill, and its
 * score is the number of pages carrying it: all of them on the left, those
 * touched in the last 30 days on the right.
 */
export function SkillAssessment({ pages }: { pages: Page[] }) {
  const now = useNow()

  const skills = React.useMemo(() => {
    const since = now - RECENT_DAYS * DAY_MS
    const counts = new Map<string, { pages: number; recent: number }>()
    for (const page of pages) {
      for (const tag of page.tags ?? []) {
        const entry = counts.get(tag) ?? { pages: 0, recent: 0 }
        entry.pages += 1
        if (now && page.updatedAt.getTime() >= since) {
          entry.recent += 1
        }
        counts.set(tag, entry)
      }
    }
    return [...counts]
      .map(([skill, count]) => ({ skill, ...count }))
      .sort((a, b) => b.pages - a.pages || a.skill.localeCompare(b.skill))
      .slice(0, MAX_SKILLS)
  }, [pages, now])

  if (skills.length < MIN_SKILLS) {
    return (
      <p className="py-1 text-sm text-muted-foreground">
        Tag your pages with what they cover, such as “HackTheBox Easy”, “Python”
        or “Web Pentesting”. Once three tags are in use, they are charted here.
      </p>
    )
  }

  const most = Math.max(...skills.map((skill) => skill.pages))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Skill Assessment</CardTitle>
          <CardDescription>Pages written per tag</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={totalConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <RadarChart accessibilityLayer data={skills} outerRadius="68%">
              <defs>
                <linearGradient id="skills-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-pages)"
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-pages)"
                    stopOpacity={0.08}
                  />
                </linearGradient>
                <filter
                  id="skills-glow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <ChartTooltip content={<ChartTooltipContent />} />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11 }}
                tickFormatter={shortLabel}
              />
              <PolarGrid strokeDasharray="3 3" />
              <PolarRadiusAxis
                angle={90}
                domain={[0, most]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="pages"
                fill="url(#skills-fill)"
                stroke="var(--color-pages)"
                strokeWidth={2}
                filter="url(#skills-glow)"
                dot={{ r: 4, fill: "var(--color-pages)", strokeWidth: 0 }}
              />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Recent Focus</CardTitle>
          <CardDescription>
            Pages updated in the last {RECENT_DAYS} days
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={recentConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <RadarChart accessibilityLayer data={skills} outerRadius="68%">
              <defs>
                <linearGradient id="focus-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-recent)"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-recent)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <filter
                  id="focus-glow"
                  x="-15%"
                  y="-15%"
                  width="130%"
                  height="130%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <ChartTooltip content={<ChartTooltipContent />} />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11 }}
                tickFormatter={shortLabel}
              />
              <PolarGrid strokeDasharray="3 3" />
              <PolarRadiusAxis
                angle={90}
                domain={[0, most]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="recent"
                fill="url(#focus-fill)"
                stroke="var(--color-recent)"
                strokeWidth={2.5}
                filter="url(#focus-glow)"
                dot={{
                  r: 4,
                  fill: "var(--background)",
                  strokeWidth: 2.5,
                  stroke: "var(--color-recent)",
                }}
              />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
