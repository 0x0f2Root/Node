import { failure } from "@/lib/pages/api-guard"
import { readImage } from "@/lib/pages/content-directory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Serves an image that a page links to. Images only, never Markdown. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/files/[...path]">
) {
  try {
    const { path } = await context.params
    const { type, data } = await readImage(path.join("/"))
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        // An SVG opened directly must not run scripts as this site.
        "Content-Security-Policy":
          "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      },
    })
  } catch (error) {
    return failure(error)
  }
}
