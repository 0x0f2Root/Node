// What Node shows of a HackTheBox player, already reduced on the server to
// the fields the tracker uses.

export interface HtbProgressRow {
  name: string
  owned: number
  total: number
}

export interface HtbProfile {
  id: number
  name: string
  avatar: string | null
  rank: string
  nextRank: string | null
  /** 0 to 100: how far along to the next rank. */
  rankProgress: number
  ranking: number | null
  points: number
  userOwns: number
  systemOwns: number
  bloods: number
  respects: number
  country: string | null
  team: string | null
  joined: string | null
}

export interface HtbActivity {
  date: string
  name: string
  /** "machine", "challenge", "sherlock", … */
  kind: string
  /** The category, such as "Web"; empty when there is none. */
  type: string
  points: number
  firstBlood: boolean
}

export interface HtbData {
  profile: HtbProfile
  /** Flags and tasks submitted on machines. */
  tasks: number
  machines: { owned: number; total: number }
  machineDifficulties: HtbProgressRow[]
  machineOs: HtbProgressRow[]
  challenges: { owned: number; total: number }
  challengeCategories: HtbProgressRow[]
  challengeDifficulties: HtbProgressRow[]
  sherlocks: { owned: number; total: number }
  badges: { name: string; description: string; date: string | null }[]
  /** Latest solves. Null without an App Token. */
  activity: HtbActivity[] | null
  /** Why `activity` is missing although a token is set. */
  activityError: string | null
}

/** One day's numbers, kept so progress can be charted over time. */
export interface HtbSnapshot {
  day: string
  points: number
  ranking: number | null
  userOwns: number
  systemOwns: number
  challenges: number
  sherlocks: number
  tasks: number
}

export interface HtbResponse {
  profileId: string | null
  /** True when HTB_APP_TOKEN is set on the server. Its value never leaves it. */
  tokenConfigured: boolean
  data: HtbData | null
  history: HtbSnapshot[]
  fetchedAt: number | null
  error: string | null
}
