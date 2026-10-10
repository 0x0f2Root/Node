import { readActivity } from "@/lib/pages/activity-log"
import { failure, forbidden, sameOrigin } from "@/lib/pages/api-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Pages worked on per day: { "2026-10-08": 3 }. */
export async function GET(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    return Response.json(await readActivity())
  } catch (error) {
    return failure(error)
  }
}
