import { failure, forbidden, sameOrigin } from "@/lib/pages/api-guard"
import { readTagStyles, writeTagStyles } from "@/lib/pages/content-directory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The colour each tag is shown in: { "<tag>": "<style id>" }. */
export async function GET(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    return Response.json(await readTagStyles())
  } catch (error) {
    return failure(error)
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    const input: unknown = await request.json().catch(() => null)
    return Response.json(await writeTagStyles(input))
  } catch (error) {
    return failure(error)
  }
}
