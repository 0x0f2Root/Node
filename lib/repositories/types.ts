export type RepositoryFileKind =
  "directory" | "markdown" | "code" | "image" | "text" | "binary"

/**
 * An imported repository: an external source with its own hierarchy, kept
 * apart from Node's own pages. Every field is JSON-safe.
 */
export type RepositorySource = {
  /** stable per remote repository, so importing twice is detected */
  id: string
  provider: "github"

  owner: string
  name: string
  fullName: string
  description?: string

  htmlUrl: string
  branch: string

  stars?: number
  forks?: number
  language?: string
  license?: string

  fileCount: number
  directoryCount: number

  /** ISO-8601 instants */
  importedAt: string
  lastSyncedAt?: string
}

/** One entry of a repository's tree. The path is its identity. */
export type RepositoryFile = {
  /** repository-relative, "/"-separated, exactly as in the remote */
  path: string
  name: string
  kind: RepositoryFileKind
  /** display name of the language, for code files */
  language?: string
  /** highlighter id for the language */
  highlight?: string
  size?: number
  /** true when the file's text is in the local snapshot */
  stored: boolean
}

/** What a provider reports about a remote repository before import. */
export type RemoteRepository = Omit<
  RepositorySource,
  "importedAt" | "lastSyncedAt" | "fileCount" | "directoryCount"
> & {
  entries: { path: string; type: "file" | "directory"; size?: number }[]
}

/**
 * The seam between Node and a code host. The UI and the snapshot store only
 * ever see this interface, so another provider (GitLab, a local folder, a
 * ZIP) can be added without touching them.
 */
export interface RepositoryProvider {
  /** Reads a repository out of a URL or "owner/name"; null if it is neither. */
  parse(input: string): { owner: string; name: string } | null
  describe(
    ref: { owner: string; name: string },
    signal?: AbortSignal
  ): Promise<RemoteRepository>
  /** The file's bytes, as stored in the remote. */
  fetchFile(
    source: Pick<RepositorySource, "owner" | "name" | "branch">,
    path: string,
    signal?: AbortSignal
  ): Promise<ArrayBuffer>
  /** Where the raw file is served from. */
  rawUrl(
    source: Pick<RepositorySource, "owner" | "name" | "branch">,
    path: string
  ): string
  /** The file or directory's page on the host. */
  webUrl(
    source: Pick<RepositorySource, "htmlUrl" | "branch">,
    path: string,
    type: "file" | "directory"
  ): string
}

export type RepositoryErrorCode =
  | "invalid-url"
  | "not-found"
  | "rate-limit"
  | "network"
  | "empty"
  | "too-large"
  | "api"
  | "cancelled"

/** A failure with a message that is safe to show as-is. */
export class RepositoryError extends Error {
  constructor(
    readonly code: RepositoryErrorCode,
    message: string
  ) {
    super(message)
    this.name = "RepositoryError"
  }
}

// extension -> [display name, highlighter id]
const LANGUAGES: Record<string, readonly [string, string]> = {
  js: ["JavaScript", "javascript"],
  mjs: ["JavaScript", "javascript"],
  cjs: ["JavaScript", "javascript"],
  jsx: ["JavaScript", "javascript"],
  ts: ["TypeScript", "typescript"],
  mts: ["TypeScript", "typescript"],
  cts: ["TypeScript", "typescript"],
  tsx: ["TypeScript", "typescript"],
  py: ["Python", "python"],
  rb: ["Ruby", "ruby"],
  go: ["Go", "go"],
  rs: ["Rust", "rust"],
  c: ["C", "c"],
  h: ["C", "c"],
  cc: ["C++", "cpp"],
  cpp: ["C++", "cpp"],
  hpp: ["C++", "cpp"],
  cs: ["C#", "csharp"],
  java: ["Java", "java"],
  kt: ["Kotlin", "kotlin"],
  swift: ["Swift", "swift"],
  php: ["PHP", "php"],
  lua: ["Lua", "lua"],
  sql: ["SQL", "sql"],
  sh: ["Shell", "bash"],
  bash: ["Shell", "bash"],
  zsh: ["Shell", "bash"],
  ps1: ["PowerShell", "powershell"],
  psm1: ["PowerShell", "powershell"],
  psd1: ["PowerShell", "powershell"],
  css: ["CSS", "css"],
  scss: ["SCSS", "scss"],
  less: ["Less", "less"],
  html: ["HTML", "xml"],
  htm: ["HTML", "xml"],
  xml: ["XML", "xml"],
  json: ["JSON", "json"],
  yaml: ["YAML", "yaml"],
  yml: ["YAML", "yaml"],
  toml: ["TOML", "ini"],
  ini: ["INI", "ini"],
  conf: ["Config", "ini"],
  cfg: ["Config", "ini"],
  diff: ["Diff", "diff"],
  patch: ["Diff", "diff"],
}

// whole file names that are code or configuration
const NAMED_LANGUAGES: Record<string, readonly [string, string]> = {
  dockerfile: ["Dockerfile", "dockerfile"],
  makefile: ["Makefile", "makefile"],
  ".env.example": ["Config", "ini"],
  ".editorconfig": ["Config", "ini"],
  ".gitconfig": ["Config", "ini"],
}

const MARKDOWN = new Set(["md", "mdx", "markdown"])
const IMAGES = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"])
const TEXT = new Set(["txt", "log", "csv", "tsv", "rst", "lock"])

// Formats that are never text. Anything else unrecognised is probed at
// import: it is kept as text if its bytes look like text.
const KNOWN_BINARY = new Set([
  "zip",
  "gz",
  "tar",
  "tgz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "jar",
  "war",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "o",
  "a",
  "class",
  "wasm",
  "pyc",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "ico",
  "bmp",
  "tiff",
  "psd",
  "mp3",
  "wav",
  "ogg",
  "flac",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "ttf",
  "otf",
  "woff",
  "woff2",
  "eot",
  "db",
  "sqlite",
])

function extension(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

/** The directory containing `path`: "" for a file at the root. */
export function parentPath(path: string): string {
  const slash = path.lastIndexOf("/")
  return slash < 0 ? "" : path.slice(0, slash)
}

/** Kind and language of a file, from its name alone. */
export function classifyFile(
  path: string
): Pick<RepositoryFile, "kind" | "language" | "highlight"> {
  const name = baseName(path)
  const ext = extension(name)

  if (MARKDOWN.has(ext)) {
    return { kind: "markdown", language: "Markdown", highlight: "markdown" }
  }
  if (IMAGES.has(ext)) {
    return { kind: "image" }
  }
  const language = NAMED_LANGUAGES[name.toLowerCase()] ?? LANGUAGES[ext]
  if (language) {
    return { kind: "code", language: language[0], highlight: language[1] }
  }
  if (TEXT.has(ext)) {
    return { kind: "text" }
  }
  return { kind: "binary" }
}

/** True for a file of unknown type that may turn out to be plain text. */
export function mayBeText(path: string): boolean {
  return !KNOWN_BINARY.has(extension(baseName(path)))
}

/**
 * Resolves a link or image reference found in a repository file to a
 * repository path: "./img/a.png" in "docs/guide.md" is "docs/img/a.png".
 * Returns null for anything that is not a path inside the repository.
 */
export function resolveRepositoryPath(
  fromFile: string,
  reference: string
): string | null {
  const target = reference.split("#")[0]?.split("?")[0] ?? ""
  if (
    !target ||
    /^[a-z][a-z0-9+.-]*:/i.test(target) ||
    target.startsWith("//")
  ) {
    return null
  }

  let decoded = target
  try {
    decoded = decodeURIComponent(target)
  } catch {
    // Keep the reference as written.
  }

  const segments = decoded.startsWith("/")
    ? []
    : parentPath(fromFile).split("/").filter(Boolean)
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") {
      continue
    }
    if (segment === "..") {
      if (segments.length === 0) {
        return null
      }
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  return segments.join("/")
}

/** The Node route for a repository, or for a path inside it. */
export function repositoryHref(id: string, path = ""): string {
  const base = `/repositories/${encodeURIComponent(id)}`
  return path
    ? `${base}/${path.split("/").map(encodeURIComponent).join("/")}`
    : base
}

export function formatBytes(size: number | undefined): string {
  if (size === undefined) {
    return ""
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
