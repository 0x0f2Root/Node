"use client"

import { useMemo, useSyncExternalStore } from "react"

import { createPersistentStore } from "@/lib/utils/store"

// A small fixed palette. Values are theme tokens, so each colour is tinted by
// the calendar for light and dark surfaces alike; "default" follows --primary.
export const EVENT_COLORS = [
  { id: "default", label: "Default", value: "var(--color-primary)" },
  { id: "blue", label: "Blue", value: "var(--color-blue-500)" },
  { id: "green", label: "Green", value: "var(--color-emerald-500)" },
  { id: "orange", label: "Orange", value: "var(--color-orange-500)" },
  { id: "red", label: "Red", value: "var(--color-red-500)" },
  { id: "purple", label: "Purple", value: "var(--color-violet-500)" },
] as const

export type EventColorId = (typeof EVENT_COLORS)[number]["id"]

export type NodeEvent = {
  id: string
  title: string
  description?: string
  start: Date
  /** Exclusive. An all-day event ends at the midnight after its last day. */
  end: Date
  allDay?: boolean
  color?: EventColorId
  /** The Node page this event is about, if any. */
  pageId?: string
}

export type NodeEventInput = Omit<NodeEvent, "id">

type StoredEvent = Omit<NodeEvent, "start" | "end"> & {
  start: string
  end: string
}

const EMPTY: StoredEvent[] = []

// Same browser-local persistence the rest of Node's client state uses.
const store = createPersistentStore<StoredEvent[]>("node.events.v1", EMPTY)

function toStored(event: NodeEvent): StoredEvent {
  return {
    ...event,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
  }
}

export function eventColorValue(color: EventColorId | undefined): string {
  return (
    EVENT_COLORS.find((option) => option.id === color)?.value ??
    EVENT_COLORS[0].value
  )
}

export function useCalendarEvents(): NodeEvent[] {
  const stored = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.getServer
  )

  return useMemo(
    () =>
      stored.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    [stored]
  )
}

export function createEvent(input: NodeEventInput): NodeEvent {
  const event: NodeEvent = { ...input, id: crypto.randomUUID() }
  store.set((events) => [...events, toStored(event)])
  return event
}

export function updateEvent(id: string, patch: Partial<NodeEventInput>) {
  store.set((events) =>
    events.map((stored) =>
      stored.id === id
        ? toStored({
            ...stored,
            start: new Date(stored.start),
            end: new Date(stored.end),
            ...patch,
          })
        : stored
    )
  )
}

export function deleteEvent(id: string) {
  store.set((events) => events.filter((event) => event.id !== id))
}
