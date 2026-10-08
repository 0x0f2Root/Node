import type { ApiPageRepository } from "@/lib/pages/api-repository"
import { parentPath, relativePath } from "@/lib/pages/paths"

// Images a page links to are files in data/pages/. The Markdown keeps an
// ordinary relative link; to display it, the link is resolved against the
// page's folder and fetched from Node's server.

/** The path inside data/pages/ that a link in `pagePath` points at. */
function resolveLink(pagePath: string, src: string): string | null {
  // Anything with a scheme, protocol-relative, or an in-page anchor.
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(src)) {
    return null
  }
  let link = src.split(/[?#]/)[0]
  try {
    link = decodeURIComponent(link)
  } catch {
    // Not percent-encoded after all: use it as written.
  }
  const segments = link.startsWith("/")
    ? []
    : parentPath(pagePath).split("/").filter(Boolean)
  for (const segment of link.split("/")) {
    if (segment === "..") {
      if (segments.length === 0) {
        // Points outside the pages directory.
        return null
      }
      segments.pop()
    } else if (segment && segment !== ".") {
      segments.push(segment)
    }
  }
  return segments.join("/") || null
}

/** A displayable URL for a link in a page; the link itself when external. */
export function resolveImage(pagePath: string, src: string): string {
  const path = resolveLink(pagePath, src)
  return path
    ? `/api/files/${path.split("/").map(encodeURIComponent).join("/")}`
    : src
}

/** Saves an image into the project and returns the link to write. */
export async function uploadImage(
  repository: ApiPageRepository,
  pagePath: string,
  file: File
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`)
  }
  const path = await repository.saveAsset(file)
  // Spaces would end a Markdown link early.
  return relativePath(parentPath(pagePath), path)
    .split("/")
    .map((segment) =>
      segment === ".." ? segment : encodeURIComponent(segment)
    )
    .join("/")
}
