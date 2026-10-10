"use client"

import { useSyncExternalStore } from "react"

import type { HtbResponse } from "@/lib/htb/types"
import { createStore } from "@/lib/utils/store"

export interface HtbState {
  status: "idle" | "loading" | "ready"
  response: HtbResponse | null
}

const INITIAL: HtbState = { status: "idle", response: null }
const store = createStore<HtbState>(INITIAL)

const UNREACHABLE: HtbResponse = {
  profileId: null,
  tokenConfigured: false,
  data: null,
  history: [],
  fetchedAt: null,
  error: "Node's server could not be reached.",
}

async function request(input: string, init?: RequestInit) {
  store.set((state) => ({ ...state, status: "loading" }))
  try {
    const response = await fetch(input, { cache: "no-store", ...init })
    const body = (await response.json()) as HtbResponse & { error?: string }
    if (!response.ok) {
      throw new Error(body.error ?? "The request failed.")
    }
    store.set({ status: "ready", response: body })
  } catch (error) {
    store.set((state) => ({
      status: "ready",
      response: state.response ?? UNREACHABLE,
    }))
    throw error
  }
}

/** Reads the tracker; `refresh` asks HackTheBox for fresh numbers. */
export function loadHtb(refresh = false) {
  return request(`/api/htb${refresh ? "?refresh=1" : ""}`)
}

/** Sets the tracked profile from a link or id; "" stops tracking. */
export function saveHtbProfile(profile: string) {
  return request("/api/htb", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  })
}

function subscribe(listener: () => void) {
  if (store.get().status === "idle") {
    void loadHtb().catch(() => undefined)
  }
  return store.subscribe(listener)
}

export function useHtb(): HtbState {
  return useSyncExternalStore(subscribe, store.get, () => INITIAL)
}
