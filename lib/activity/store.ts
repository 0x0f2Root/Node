"use client"

import { useSyncExternalStore } from "react"

import { createStore } from "@/lib/utils/store"

export interface ActivityState {
  loaded: boolean
  /** Local calendar day ("2026-10-08") to pages worked on that day. */
  days: Record<string, number>
}

const INITIAL: ActivityState = { loaded: false, days: {} }
const store = createStore<ActivityState>(INITIAL)
let started = false

/** Reads the activity log again from Node's server. */
export async function refreshActivity() {
  try {
    const response = await fetch("/api/activity", { cache: "no-store" })
    if (response.ok) {
      store.set({
        loaded: true,
        days: (await response.json()) as Record<string, number>,
      })
      return
    }
  } catch {
    // Shown as an empty grid below.
  }
  store.set((state) => ({ ...state, loaded: true }))
}

function subscribe(listener: () => void) {
  if (!started) {
    started = true
    void refreshActivity()
    window.addEventListener("focus", () => void refreshActivity())
  }
  return store.subscribe(listener)
}

export function useActivity(): ActivityState {
  return useSyncExternalStore(subscribe, store.get, () => INITIAL)
}

/** The local calendar day of a moment, as the log writes it. */
export function dayKey(time: number | Date): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}
