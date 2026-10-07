"use client"

import { useSyncExternalStore } from "react"

import { createPersistentStore } from "@/lib/utils/store"

export interface RecentVisit {
  id: string
  /** epoch ms of the last time the page was opened */
  at: number
}

const MAX_RECENTS = 12
const EMPTY: RecentVisit[] = []

const store = createPersistentStore<RecentVisit[]>("node.recent.v1", EMPTY)

export function recordVisit(id: string) {
  store.set((visits) =>
    [
      { id, at: Date.now() },
      ...visits.filter((visit) => visit.id !== id),
    ].slice(0, MAX_RECENTS)
  )
}

export function useRecents(): RecentVisit[] {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer)
}
