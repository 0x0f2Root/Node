// A page is a file and a folder is a directory, so a record's identity is its
// path inside the project. Ids are that path, encoded so it can sit in a URL
// segment without escaping: there is no hidden id-to-file table to drift.

export function pathToId(path: string): string {
  const bytes = new TextEncoder().encode(path)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** The project-relative path behind an id; "" when it is not one. */
export function idToPath(id: string): string {
  try {
    const binary = atob(id.replace(/-/g, "+").replace(/_/g, "/"))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return ""
  }
}

export function parentPath(path: string): string {
  const slash = path.lastIndexOf("/")
  return slash < 0 ? "" : path.slice(0, slash)
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

export function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name
}

const PAGE_EXTENSION = /\.mdx?$/i

export function isPageFile(name: string): boolean {
  return PAGE_EXTENSION.test(name)
}

/** "XSS.md" is shown as "XSS". */
export function titleOfFile(name: string): string {
  return name.replace(PAGE_EXTENSION, "")
}

/** ".md", or the extension the file already has. */
export function extensionOf(name: string): string {
  return name.match(PAGE_EXTENSION)?.[0] ?? ".md"
}

/** A title made safe to use as a file or directory name. */
export function toFileName(title: string): string {
  const cleaned = title
    // Characters no common filesystem accepts, and control characters.
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    // Windows refuses names ending in a dot or space.
    .replace(/[. ]+$/, "")
  return cleaned || "Untitled"
}

/** How `to` is written from a file inside `fromDirectory`. */
export function relativePath(fromDirectory: string, to: string): string {
  const from = fromDirectory.split("/").filter(Boolean)
  const target = to.split("/").filter(Boolean)
  let shared = 0
  while (
    shared < from.length &&
    shared < target.length - 1 &&
    from[shared] === target[shared]
  ) {
    shared += 1
  }
  return [
    ...Array.from({ length: from.length - shared }, () => ".."),
    ...target.slice(shared),
  ].join("/")
}
