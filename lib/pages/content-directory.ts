import { promises as fs } from "node:fs"
import path from "node:path"

// Server only. Node's pages are plain files in the project, under
// data/pages/: a directory is a folder (a workspace at the top level) and a
// .md or .mdx file is a page. Every function here takes a path relative to
// that directory and refuses anything that would leave it.

const ROOT = path.join(process.cwd(), "data", "pages")

/** Where pasted and dropped images are written. Not part of the page tree. */
export const ASSETS_DIRECTORY = "assets"

const PAGE_FILE = /\.mdx?$/i
const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
}
const MAX_IMAGE_BYTES = 25 * 1024 * 1024

export class ContentError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 413
  ) {
    super(message)
  }
}

export interface ContentEntry {
  path: string
  directory: boolean
  /** Modification time, epoch milliseconds. */
  modified: number
}

function code(error: unknown) {
  return (error as NodeJS.ErrnoException | null)?.code
}

async function root() {
  await fs.mkdir(ROOT, { recursive: true })
  return fs.realpath(ROOT)
}

function checkName(name: string) {
  if (
    name === "" ||
    name.startsWith(".") ||
    name.length > 200 ||
    /[\\/:*?"<>|\u0000-\u001f]/.test(name) ||
    /[. ]$/.test(name)
  ) {
    throw new ContentError("That name cannot be used for a file.", 400)
  }
  return name
}

/**
 * The absolute location of a relative path, guaranteed to be inside the
 * content directory: no "..", no hidden or absolute segments, and no symlink
 * on the way that leads out.
 */
async function locate(relative: string): Promise<string> {
  if (typeof relative !== "string") {
    throw new ContentError("A path is required.", 400)
  }
  const segments = relative.split("/").filter(Boolean)
  segments.forEach(checkName)
  const base = await root()
  const target = path.join(base, ...segments)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new ContentError("That path is outside the pages directory.", 400)
  }

  // Resolve the deepest part that exists and make sure it is still inside.
  let existing = target
  for (;;) {
    try {
      const real = await fs.realpath(existing)
      if (real !== base && !real.startsWith(base + path.sep)) {
        throw new ContentError("That path is outside the pages directory.", 400)
      }
      break
    } catch (error) {
      if (error instanceof ContentError || code(error) !== "ENOENT") {
        throw error
      }
      existing = path.dirname(existing)
    }
  }
  return target
}

function missing(error: unknown): never {
  if (code(error) === "ENOENT") {
    throw new ContentError("That file no longer exists.", 404)
  }
  throw error
}

async function exists(target: string) {
  try {
    await fs.lstat(target)
    return true
  } catch (error) {
    if (code(error) === "ENOENT") {
      return false
    }
    throw error
  }
}

function modifiedOf(stats: { mtimeMs: number }) {
  return Math.floor(stats.mtimeMs)
}

/** Every folder and page: names and dates only, never the Markdown. */
export async function listEntries(): Promise<ContentEntry[]> {
  const base = await root()
  const entries: ContentEntry[] = []

  async function walk(directory: string, relative: string): Promise<number> {
    let latest = 0
    for (const item of await fs.readdir(directory, { withFileTypes: true })) {
      // Hidden entries and symlinks are not part of the notes.
      if (item.name.startsWith(".") || item.name === "node_modules") {
        continue
      }
      const childPath = relative ? `${relative}/${item.name}` : item.name
      const absolute = path.join(directory, item.name)
      if (item.isDirectory()) {
        if (relative === "" && item.name === ASSETS_DIRECTORY) {
          continue
        }
        const entry: ContentEntry = {
          path: childPath,
          directory: true,
          modified: 0,
        }
        entries.push(entry)
        entry.modified =
          (await walk(absolute, childPath)) ||
          modifiedOf(await fs.stat(absolute))
        latest = Math.max(latest, entry.modified)
      } else if (item.isFile() && PAGE_FILE.test(item.name)) {
        const modified = modifiedOf(await fs.stat(absolute))
        entries.push({ path: childPath, directory: false, modified })
        latest = Math.max(latest, modified)
      }
    }
    return latest
  }

  await walk(base, "")
  return entries
}

function requirePage(relative: string) {
  if (!PAGE_FILE.test(relative)) {
    throw new ContentError("That is not a Markdown page.", 400)
  }
}

export async function statEntry(relative: string): Promise<ContentEntry> {
  const target = await locate(relative)
  const stats = await fs.stat(target).catch(missing)
  return {
    path: relative,
    directory: stats.isDirectory(),
    modified: modifiedOf(stats),
  }
}

export async function readPage(relative: string) {
  requirePage(relative)
  const target = await locate(relative)
  const content = await fs.readFile(target, "utf8").catch(missing)
  return { content, modified: modifiedOf(await fs.stat(target)) }
}

// Written beside the file and renamed over it, so a crash mid-write cannot
// leave half a document.
async function writeAtomic(target: string, data: string | Uint8Array) {
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.tmp`
  )
  await fs.writeFile(temporary, data)
  await fs.rename(temporary, target)
}

/** Creates a page or a directory. Never replaces something already there. */
export async function createEntry(
  relative: string,
  directory: boolean,
  content: string
): Promise<ContentEntry> {
  const target = await locate(relative)
  if (!directory) {
    requirePage(relative)
  }
  if (!(await exists(path.dirname(target)))) {
    throw new ContentError("The folder for this item no longer exists.", 404)
  }
  try {
    if (directory) {
      await fs.mkdir(target)
    } else {
      // "wx" fails if the file exists.
      await fs.writeFile(target, content, { flag: "wx" })
    }
  } catch (error) {
    if (code(error) === "EEXIST") {
      throw new ContentError(
        `"${path.basename(target)}" already exists in this folder.`,
        409
      )
    }
    throw error
  }
  return statEntry(relative)
}

/**
 * Saves a page's Markdown. With `expected`, refuses when the file has been
 * changed by something else since that modification time.
 */
export async function writePage(
  relative: string,
  content: string,
  expected?: number
): Promise<number> {
  requirePage(relative)
  const target = await locate(relative)
  if (expected !== undefined && (await exists(target))) {
    if (modifiedOf(await fs.stat(target)) !== expected) {
      throw new ContentError("This page was changed outside Node.", 409)
    }
  }
  if (!(await exists(path.dirname(target)))) {
    throw new ContentError("The folder for this page no longer exists.", 404)
  }
  await writeAtomic(target, content)
  return modifiedOf(await fs.stat(target))
}

/** Renames or moves a page or directory. Never replaces the destination. */
export async function moveEntry(from: string, to: string) {
  const source = await locate(from)
  const target = await locate(to)
  const stats = await fs.stat(source).catch(missing)
  if (!stats.isDirectory()) {
    requirePage(from)
    requirePage(to)
  } else if (target.startsWith(source + path.sep)) {
    throw new ContentError("A folder cannot be moved into itself.", 400)
  }
  if (source === target) {
    return
  }
  // A change of capitals only is the same file on some filesystems.
  const caseOnly = source.toLowerCase() === target.toLowerCase()
  if (!caseOnly && (await exists(target))) {
    throw new ContentError(
      `"${path.basename(target)}" already exists there.`,
      409
    )
  }
  if (!(await exists(path.dirname(target)))) {
    throw new ContentError("The destination folder no longer exists.", 404)
  }
  await fs.rename(source, target)
}

export async function deleteEntry(relative: string) {
  const target = await locate(relative)
  if (target === (await root())) {
    throw new ContentError("The pages directory itself cannot be deleted.", 400)
  }
  await fs.rm(target, { recursive: true, force: true })
}

/** Saves an image under assets/ with a free name; returns its path. */
export async function saveImage(name: string, data: Uint8Array) {
  const extension = path.extname(name).toLowerCase()
  if (!IMAGE_TYPES[extension]) {
    throw new ContentError(`${name} is not an image Node can store.`, 400)
  }
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw new ContentError(`${name} is larger than 25 MB.`, 413)
  }
  const stem =
    path
      .basename(name, path.extname(name))
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/^\.+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/, "") || "image"

  const directory = await locate(ASSETS_DIRECTORY)
  await fs.mkdir(directory, { recursive: true })
  for (let count = 1; ; count += 1) {
    const file = `${stem}${count > 1 ? `-${count}` : ""}${extension}`
    try {
      // `directory` is always data/pages/assets; the bundler cannot see that.
      await fs.writeFile(
        path.join(/* turbopackIgnore: true */ directory, file),
        data,
        { flag: "wx" }
      )
      return `${ASSETS_DIRECTORY}/${file}`
    } catch (error) {
      if (code(error) !== "EEXIST") {
        throw error
      }
    }
  }
}

/** An image anywhere in the pages directory, for display in a page. */
export async function readImage(relative: string) {
  const type = IMAGE_TYPES[path.extname(relative).toLowerCase()]
  if (!type) {
    throw new ContentError("That is not an image.", 400)
  }
  const target = await locate(relative)
  return { type, data: await fs.readFile(target).catch(missing) }
}
