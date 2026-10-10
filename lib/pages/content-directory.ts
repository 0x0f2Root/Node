import { promises as fs } from "node:fs"
import path from "node:path"

// Server only. Node's pages are plain files in the project, under
// data/pages/: a directory is a folder (a workspace at the top level) and a
// .md or .mdx file is a page. Every function here takes a path relative to
// that directory and refuses anything that would leave it.

const ROOT = path.join(process.cwd(), "data", "pages")
// Which colour each tag is shown in. The tags themselves are in the pages.
const TAG_STYLES_FILE = path.join(process.cwd(), "data", "tags.json")

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
  /** A page's tags, from its frontmatter. */
  tags?: string[]
}

// A page's tags are a `tags:` list in the YAML frontmatter at the top of its
// file, where other Markdown tools look for them too. Node shows and edits
// the document below the frontmatter; whatever else the frontmatter holds is
// kept exactly as written.
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 40

function splitFrontmatter(source: string) {
  const match = source.match(FRONTMATTER)
  if (!match) {
    return { yaml: null, body: source }
  }
  return {
    yaml: match[1],
    // One blank line after the closing fence belongs to the fence.
    body: source.slice(match[0].length).replace(/^\r?\n/, ""),
  }
}

function unquote(value: string) {
  return value
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim()
}

export function cleanTags(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }
  const seen = new Set<string>()
  const tags: string[] = []
  for (const value of values) {
    if (typeof value !== "string") {
      continue
    }
    const tag = value
      .replace(/[\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TAG_LENGTH)
    if (tag && !seen.has(tag.toLowerCase()) && tags.length < MAX_TAGS) {
      seen.add(tag.toLowerCase())
      tags.push(tag)
    }
  }
  return tags
}

const TAG_ITEM = /^\s*-\s+(.*)$/

function parseTags(yaml: string | null): string[] {
  if (!yaml) {
    return []
  }
  const lines = yaml.split(/\r?\n/)
  const index = lines.findIndex((line) => /^tags\s*:/.test(line))
  if (index < 0) {
    return []
  }
  const inline = lines[index].replace(/^tags\s*:/, "").trim()
  if (inline) {
    // tags: [a, b]   or   tags: a, b
    return cleanTags(
      inline
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map(unquote)
    )
  }
  const items: string[] = []
  for (const line of lines.slice(index + 1)) {
    const item = line.match(TAG_ITEM)
    if (!item) {
      break
    }
    items.push(unquote(item[1]))
  }
  return cleanTags(items)
}

/** The frontmatter with its `tags:` entry replaced; null when left empty. */
function withTags(yaml: string | null, tags: string[]): string | null {
  const kept: string[] = []
  let inTags = false
  for (const line of yaml ? yaml.split(/\r?\n/) : []) {
    if (/^tags\s*:/.test(line)) {
      inTags = true
    } else if (!(inTags && TAG_ITEM.test(line))) {
      inTags = false
      kept.push(line)
    }
  }
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") {
    kept.pop()
  }
  if (tags.length > 0) {
    // JSON strings are valid YAML, whatever characters the name has.
    kept.push("tags:", ...tags.map((tag) => `  - ${JSON.stringify(tag)}`))
  }
  return kept.length > 0 ? kept.join("\n") : null
}

function compose(yaml: string | null, body: string) {
  return yaml === null ? body : `---\n${yaml}\n---\n\n${body}`
}

// Tags sit at the very top of a file, so listing reads only its first part.
async function readHeadTags(file: string): Promise<string[]> {
  const handle = await fs.open(file, "r")
  try {
    const buffer = Buffer.alloc(4096)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const head = buffer.subarray(0, bytesRead).toString("utf8")
    return head.startsWith("---") ? parseTags(splitFrontmatter(head).yaml) : []
  } finally {
    await handle.close()
  }
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
        const tags = await readHeadTags(absolute)
        entries.push({ path: childPath, directory: false, modified, tags })
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
  const source = await fs.readFile(target, "utf8").catch(missing)
  const { yaml, body } = splitFrontmatter(source)
  return {
    content: body,
    tags: parseTags(yaml),
    modified: modifiedOf(await fs.stat(target)),
  }
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
 * Saves a page's Markdown, keeping the frontmatter the file already has.
 * With `expected`, refuses when the file has been changed by something else
 * since that modification time.
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
  const existing = (await exists(target))
    ? splitFrontmatter(await fs.readFile(target, "utf8")).yaml
    : null
  await writeAtomic(target, compose(existing, content))
  return modifiedOf(await fs.stat(target))
}

/** Replaces a page's tags; the document itself is not touched. */
export async function writeTags(
  relative: string,
  tags: unknown
): Promise<ContentEntry> {
  requirePage(relative)
  const target = await locate(relative)
  const source = await fs.readFile(target, "utf8").catch(missing)
  const { yaml, body } = splitFrontmatter(source)
  const cleaned = cleanTags(tags)
  await writeAtomic(target, compose(withTags(yaml, cleaned), body))
  return {
    path: relative,
    directory: false,
    modified: modifiedOf(await fs.stat(target)),
    tags: cleaned,
  }
}

/** Tag name to the id of the badge style it is shown in. */
export async function readTagStyles(): Promise<Record<string, string>> {
  try {
    const parsed: unknown = JSON.parse(
      await fs.readFile(TAG_STYLES_FILE, "utf8")
    )
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {}
  } catch (error) {
    if (code(error) === "ENOENT" || error instanceof SyntaxError) {
      return {}
    }
    throw error
  }
}

export async function writeTagStyles(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ContentError("Tag styles must be an object.", 400)
  }
  const styles: Record<string, string> = {}
  for (const [name, style] of Object.entries(input)) {
    const [tag] = cleanTags([name])
    if (tag && typeof style === "string" && /^[a-z-]{1,40}$/.test(style)) {
      styles[tag] = style
    }
  }
  await fs.mkdir(path.dirname(TAG_STYLES_FILE), { recursive: true })
  await writeAtomic(TAG_STYLES_FILE, `${JSON.stringify(styles, null, 2)}\n`)
  return styles
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
