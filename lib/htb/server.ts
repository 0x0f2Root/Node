import { promises as fs } from "node:fs"
import path from "node:path"

import type {
  HtbActivity,
  HtbData,
  HtbProgressRow,
  HtbResponse,
  HtbSnapshot,
} from "@/lib/htb/types"
import { dayKey } from "@/lib/pages/activity-log"

// Server only. Reads a HackTheBox player's public numbers. The profile
// endpoints used here answer without a key but are not documented, so every
// field is read defensively and a failure is reported, never thrown at the
// page. With HTB_APP_TOKEN set (in .env.local), the latest solves are read
// too. The token stays in this process: it is not stored, logged or sent to
// the browser.

const API = "https://labs.hackthebox.com/api/v4"
const API_V5 = "https://labs.hackthebox.com/api/v5"
const FILE = path.join(process.cwd(), "data", "htb.json")
const CACHE_MS = 10 * 60 * 1000
const MIN_REFRESH_MS = 30 * 1000
const HISTORY_DAYS = 400

interface Stored {
  profileId: string | null
  snapshots: Record<string, Omit<HtbSnapshot, "day">>
}

type Json = Record<string, unknown>

async function readStored(): Promise<Stored> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(FILE, "utf8")
    ) as Partial<Stored>
    return {
      profileId:
        typeof parsed.profileId === "string" &&
        /^\d{1,12}$/.test(parsed.profileId)
          ? parsed.profileId
          : null,
      snapshots:
        parsed.snapshots && typeof parsed.snapshots === "object"
          ? parsed.snapshots
          : {},
    }
  } catch {
    return { profileId: null, snapshots: {} }
  }
}

async function writeStored(stored: Stored) {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  const temporary = `${FILE}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(stored, null, 2)}\n`)
  await fs.rename(temporary, FILE)
}

/** The numeric id in a profile link or typed on its own; null if neither. */
export function parseProfileId(input: string): string | null {
  const value = input.trim()
  if (/^\d{1,12}$/.test(value)) {
    return value
  }
  const match = value.match(
    /^https?:\/\/(?:app|www|labs)\.hackthebox\.com\/(?:public\/users|users|profile)\/(\d{1,12})(?:[/?#].*)?$/i
  )
  return match ? match[1] : null
}

function token() {
  return process.env.HTB_APP_TOKEN?.trim() || null
}

// Only ever this host, and only paths built here from a numeric id.
async function get(
  route: string,
  authorized = false,
  base = API
): Promise<Json> {
  const response = await fetch(`${base}/${route}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Node-notes/0.1 (personal HackTheBox tracker)",
      ...(authorized && token()
        ? { Authorization: `Bearer ${token()}` }
        : null),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    throw new Error(`HackTheBox answered ${response.status}`)
  }
  const body: unknown = await response.json()
  return body && typeof body === "object" ? (body as Json) : {}
}

function object(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {}
}

function list(value: unknown): Json[] {
  return Array.isArray(value) ? value.map(object) : []
}

function number(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function rows(value: unknown, owned: string, total: string): HtbProgressRow[] {
  return list(value).map((row) => ({
    name: text(row.name) ?? "Other",
    owned: number(row[owned]),
    total: number(row[total]),
  }))
}

function owns(value: unknown) {
  const source = object(value)
  return { owned: number(source.solved), total: number(source.total) }
}

// The solve feed lives in version 5 of the API (the version 4 route is
// gone) and needs the App Token.
async function readActivity(profileId: string): Promise<HtbActivity[]> {
  const body = await get(`user/profile/activity/${profileId}`, true, API_V5)
  return list(body.data)
    .slice(0, 30)
    .map((item) => ({
      date: text(item.ownDate) ?? text(item.date) ?? "",
      name: text(item.name) ?? "Unknown",
      kind: text(item.type) ?? "",
      type: text(item.categoryName) ?? "",
      points: number(item.points),
      firstBlood: item.blood === true || item.blood === 1,
    }))
}

async function readProfile(profileId: string): Promise<HtbData> {
  const optional = (route: string) => get(route).catch((): Json => ({}))
  const [basic, machines, challenges, sherlocks, badges] = await Promise.all([
    get(`profile/${profileId}`),
    optional(`profile/progress/machines/${profileId}`),
    optional(`profile/progress/challenges/${profileId}`),
    optional(`profile/progress/sherlocks/${profileId}`),
    optional(`profile/badges/${profileId}`),
  ])
  const profile = object(basic.profile)
  if (!text(profile.name)) {
    throw new Error("That profile was not found, or it is not public.")
  }
  const machine = object(machines.profile)
  const challenge = object(challenges.profile)

  let activity: HtbActivity[] | null = null
  let activityError: string | null = null
  if (token()) {
    try {
      activity = await readActivity(profileId)
    } catch (error) {
      activityError =
        error instanceof Error ? error.message : "The activity feed failed."
    }
  }

  return {
    profile: {
      id: number(profile.id),
      name: text(profile.name) ?? "",
      avatar: text(profile.avatar),
      rank: text(profile.rank) ?? "Unranked",
      nextRank: text(profile.next_rank),
      rankProgress: Math.max(
        0,
        Math.min(100, number(profile.current_rank_progress))
      ),
      ranking: number(profile.ranking) || null,
      points: number(profile.points),
      userOwns: number(profile.user_owns),
      systemOwns: number(profile.system_owns),
      bloods:
        number(profile.user_bloods) +
        number(profile.system_bloods) +
        number(profile.challenge_bloods),
      respects: number(profile.respects),
      country: text(profile.country_name),
      team: text(object(profile.team).name),
      joined: text(profile.joined_date),
    },
    tasks: number(machine.solved_tasks),
    machines: owns(machine.machine_owns),
    machineDifficulties: rows(
      machine.machine_difficulties,
      "owned_machines",
      "total_machines"
    ),
    machineOs: rows(machine.machine_os, "owned_machines", "total_machines"),
    challenges: owns(challenge.challenge_owns),
    challengeCategories: rows(
      challenge.challenge_categories,
      "owned_flags",
      "total_flags"
    ),
    challengeDifficulties: rows(
      challenge.challenge_difficulties,
      "owned_challenges",
      "total_challenges"
    ),
    sherlocks: owns(object(sherlocks.profile).challenge_owns),
    badges: list(badges.badges).map((badge) => ({
      name: text(badge.name) ?? "Badge",
      description: (text(badge.description) ?? "").replace(/<[^>]*>/g, ""),
      date: text(object(badge.pivot).created_at),
    })),
    activity,
    activityError,
  }
}

function history(stored: Stored): HtbSnapshot[] {
  return Object.entries(stored.snapshots)
    .filter(([day]) => /^\d{4}-\d{2}-\d{2}$/.test(day))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-HISTORY_DAYS)
    .map(([day, snapshot]) => ({ day, ...snapshot }))
}

let cache: { profileId: string; at: number; data: HtbData } | null = null

/** The tracker's data. `refresh` asks HackTheBox again, at most twice a minute. */
export async function readTracker(refresh = false): Promise<HtbResponse> {
  const stored = await readStored()
  const base = {
    profileId: stored.profileId,
    tokenConfigured: token() !== null,
  }
  if (!stored.profileId) {
    return { ...base, data: null, history: [], fetchedAt: null, error: null }
  }

  const age =
    cache?.profileId === stored.profileId ? Date.now() - cache.at : Infinity
  if (cache && age < (refresh ? MIN_REFRESH_MS : CACHE_MS)) {
    return {
      ...base,
      data: cache.data,
      history: history(stored),
      fetchedAt: cache.at,
      error: null,
    }
  }

  try {
    const data = await readProfile(stored.profileId)
    cache = { profileId: stored.profileId, at: Date.now(), data }
    // Today's numbers take the place of any read earlier today.
    stored.snapshots[dayKey(Date.now())] = {
      points: data.profile.points,
      ranking: data.profile.ranking,
      userOwns: data.profile.userOwns,
      systemOwns: data.profile.systemOwns,
      challenges: data.challenges.owned,
      sherlocks: data.sherlocks.owned,
      tasks: data.tasks,
    }
    await writeStored(stored).catch(() => undefined)
    return {
      ...base,
      data,
      history: history(stored),
      fetchedAt: cache.at,
      error: null,
    }
  } catch (error) {
    // Keep showing the last good numbers if there are any.
    const stale = cache?.profileId === stored.profileId ? cache : null
    return {
      ...base,
      data: stale?.data ?? null,
      history: history(stored),
      fetchedAt: stale?.at ?? null,
      error:
        error instanceof Error
          ? error.message
          : "HackTheBox could not be reached.",
    }
  }
}

/** Sets the tracked profile, or none. History belongs to one profile. */
export async function setProfile(profileId: string | null) {
  const stored = await readStored()
  if (stored.profileId !== profileId) {
    cache = null
    await writeStored({ profileId, snapshots: {} })
  }
}
