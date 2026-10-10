"use client"

import * as React from "react"

import {
  CalendarHeatmap,
  type CalendarDay,
} from "@/components/spectrumui/charts/calendar-heatmap"
import { dayKey, refreshActivity, useActivity } from "@/lib/activity/store"
import { useTasks } from "@/lib/tasks/tasks"
import { useNow } from "@/lib/utils/time"

// 53 full weeks, like a contributions graph.
const DAYS = 371

/**
 * A year of work at a glance: for each day, the pages created or edited plus
 * the tasks finished.
 */
export function ActivityTracker() {
  const { loaded, days } = useActivity()
  const tasks = useTasks()
  const now = useNow()

  // Saves made since the last visit to Home count too.
  React.useEffect(() => {
    void refreshActivity()
  }, [])

  const data = React.useMemo(() => {
    if (!now) {
      return []
    }
    const finished = new Map<string, number>()
    for (const task of tasks) {
      if (task.status === "done") {
        const day = dayKey(new Date(task.updatedAt))
        finished.set(day, (finished.get(day) ?? 0) + 1)
      }
    }

    const today = new Date(now)
    const series: CalendarDay[] = []
    for (let back = DAYS - 1; back >= 0; back -= 1) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - back
      )
      const day = dayKey(date)
      series.push({
        // The grid lays days out in UTC; give it this local day's date.
        t: Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
        value: (days[day] ?? 0) + (finished.get(day) ?? 0),
      })
    }
    return series
  }, [now, days, tasks])

  return (
    <div className="flex flex-col gap-1">
      <CalendarHeatmap
        data={data}
        label="contributions"
        status={loaded && data.length > 0 ? "ready" : "loading"}
      />
      <p className="text-xs text-muted-foreground">
        A contribution is a page you created or edited, or a task you completed,
        on that day.
      </p>
    </div>
  )
}
