"use client"

import { useSyncExternalStore } from "react"

import { createStore } from "@/lib/utils/store"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(date: Date, now: number): string {
  const elapsed = now - date.getTime()

  if (elapsed < MINUTE) {
    return "just now"
  }
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  if (elapsed < 2 * DAY) {
    return "yesterday"
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)} days ago`
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** A short elapsed time for chips: "now", "5m", "3h", "2d", "6w". */
export function formatCompactTime(date: Date, now: number): string {
  const elapsed = Math.max(0, now - date.getTime())
  if (elapsed < MINUTE) {
    return "now"
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m`
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h`
  }
  if (elapsed < 14 * DAY) {
    return `${Math.floor(elapsed / DAY)}d`
  }
  return `${Math.floor(elapsed / (7 * DAY))}w`
}

export function greeting(now: number): string {
  const hour = new Date(now).getHours()
  if (hour < 5) {
    return "Good evening"
  }
  if (hour < 12) {
    return "Good morning"
  }
  if (hour < 18) {
    return "Good afternoon"
  }
  return "Good evening"
}

// A shared clock: 0 on the server and during hydration, then the current
// time, refreshed every 30 seconds while anything is subscribed.
const clock = createStore(0)
let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  const unsubscribe = clock.subscribe(listener)
  subscribers += 1
  if (subscribers === 1) {
    clock.set(Date.now())
    timer = setInterval(() => clock.set(Date.now()), 30_000)
  }
  return () => {
    unsubscribe()
    subscribers -= 1
    if (subscribers === 0) {
      clearInterval(timer)
    }
  }
}

/** The current time in epoch ms, or 0 before the client has mounted. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, clock.get, () => 0)
}
