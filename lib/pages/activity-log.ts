import { promises as fs } from "node:fs"
import path from "node:path"

import { listEntries } from "@/lib/pages/content-directory"

// Server only. Which pages were worked on each day, for the activity grid on
// Home. A file's modification time only remembers the last edit, so each
// day's pages are written down as they happen: local calendar day to paths.
const FILE = path.join(process.cwd(), "data", "activity.json")

type ActivityLog = Record<string, string[]>

export function dayKey(time: number | Date): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

async function readLog(): Promise<ActivityLog> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(FILE, "utf8"))
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ActivityLog)
      : {}
  } catch {
    // Missing or unreadable: start again. The pages are not affected.
    return {}
  }
}

// Autosave writes a page many times a day; only the first one is new.
const recorded = new Set<string>()
let queue: Promise<void> = Promise.resolve()

/** Notes that a page was created or edited today. Never throws. */
export function recordActivity(relative: string): Promise<void> {
  const day = dayKey(Date.now())
  const mark = `${day}|${relative}`
  if (recorded.has(mark)) {
    return queue
  }
  if (recorded.size > 5000) {
    recorded.clear()
  }
  recorded.add(mark)

  queue = queue
    .then(async () => {
      const log = await readLog()
      const pages = Array.isArray(log[day]) ? log[day] : []
      if (pages.includes(relative)) {
        return
      }
      log[day] = [...pages, relative]
      await fs.mkdir(path.dirname(FILE), { recursive: true })
      const temporary = `${FILE}.${process.pid}.tmp`
      await fs.writeFile(temporary, `${JSON.stringify(log, null, 2)}\n`)
      await fs.rename(temporary, FILE)
    })
    .catch(() => {
      recorded.delete(mark)
    })
  return queue
}

/**
 * Pages worked on per day. Days from before the log existed are filled in
 * from each file's last modification date.
 */
export async function readActivity(): Promise<Record<string, number>> {
  const days = new Map<string, Set<string>>()
  const add = (day: string, page: string) => {
    const pages = days.get(day)
    if (pages) {
      pages.add(page)
    } else {
      days.set(day, new Set([page]))
    }
  }

  for (const [day, pages] of Object.entries(await readLog())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(pages)) {
      pages.forEach((page) => add(day, String(page)))
    }
  }
  for (const entry of await listEntries()) {
    if (!entry.directory) {
      add(dayKey(entry.modified), entry.path)
    }
  }
  return Object.fromEntries(
    [...days].map(([day, pages]): [string, number] => [day, pages.size])
  )
}
