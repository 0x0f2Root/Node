import { ContentError } from "@/lib/pages/content-directory"

/**
 * Node has no accounts, so the pages API trusts whoever can reach the
 * server. This at least stops another website open in the same browser from
 * changing files through it: a request that names a different origin is
 * refused.
 */
export function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site")
  if (site && site !== "same-origin" && site !== "none") {
    return false
  }
  const origin = request.headers.get("origin")
  if (!origin) {
    return true
  }
  try {
    return new URL(origin).host === request.headers.get("host")
  } catch {
    return false
  }
}

export function forbidden() {
  return Response.json(
    { error: "Requests from other sites are not allowed." },
    { status: 403 }
  )
}

export function failure(error: unknown) {
  if (error instanceof ContentError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return Response.json(
    { error: "The pages directory could not be read or written." },
    { status: 500 }
  )
}
