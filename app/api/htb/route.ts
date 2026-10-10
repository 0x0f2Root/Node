import { parseProfileId, readTracker, setProfile } from "@/lib/htb/server"
import { forbidden, sameOrigin } from "@/lib/pages/api-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The HackTheBox tracker's data; ?refresh=1 asks HackTheBox again. */
export async function GET(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  const refresh = new URL(request.url).searchParams.has("refresh")
  return Response.json(await readTracker(refresh))
}

/** Sets the tracked profile: { profile: "<id or profile link>" }, "" to stop. */
export async function PUT(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  const input = (await request.json().catch(() => null)) as {
    profile?: unknown
  } | null
  const value = typeof input?.profile === "string" ? input.profile : ""
  const profileId = value.trim() === "" ? null : parseProfileId(value)
  if (value.trim() !== "" && profileId === null) {
    return Response.json(
      { error: "Enter a HackTheBox profile link or its numeric id." },
      { status: 400 }
    )
  }
  await setProfile(profileId)
  return Response.json(await readTracker(true))
}
