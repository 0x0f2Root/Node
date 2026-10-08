import { failure, forbidden, sameOrigin } from "@/lib/pages/api-guard"
import {
  ContentError,
  createEntry,
  deleteEntry,
  listEntries,
  moveEntry,
  readPage,
  statEntry,
  writePage,
} from "@/lib/pages/content-directory"

// Reads and writes files in data/pages/, so it runs on the Node.js server
// for every request and is never prerendered.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function text(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ContentError(`"${field}" is required.`, 400)
  }
  return value
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json()
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Falls through to the error below.
  }
  throw new ContentError("The request was not valid JSON.", 400)
}

/** The tree, or with ?path= one page (&stat=1 for its date only). */
export async function GET(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    const query = new URL(request.url).searchParams
    const path = query.get("path")
    if (path === null) {
      return Response.json({ entries: await listEntries() })
    }
    if (query.has("stat")) {
      return Response.json(await statEntry(path))
    }
    return Response.json(await readPage(path))
  } catch (error) {
    return failure(error)
  }
}

/** Creates a page or folder: { path, directory?, content? }. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    const input = await body(request)
    const entry = await createEntry(
      text(input.path, "path"),
      input.directory === true,
      typeof input.content === "string" ? input.content : ""
    )
    return Response.json(entry, { status: 201 })
  } catch (error) {
    return failure(error)
  }
}

/** Saves text ({ path, content, expected? }) or moves ({ path, to }). */
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    const input = await body(request)
    const path = text(input.path, "path")
    if (typeof input.to === "string") {
      await moveEntry(path, input.to)
      return Response.json(await statEntry(input.to))
    }
    const modified = await writePage(
      path,
      text(input.content, "content"),
      typeof input.expected === "number" ? input.expected : undefined
    )
    return Response.json({ path, directory: false, modified })
  } catch (error) {
    return failure(error)
  }
}

/** Deletes a page, or a folder with everything in it: { path }. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    await deleteEntry(text((await body(request)).path, "path"))
    return new Response(null, { status: 204 })
  } catch (error) {
    return failure(error)
  }
}
