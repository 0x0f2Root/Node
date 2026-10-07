"use client"

import { providerFor, saveSnapshot } from "@/lib/repositories/store"
import {
  RepositoryError,
  baseName,
  classifyFile,
  mayBeText,
  type RemoteRepository,
  type RepositoryFile,
  type RepositorySource,
} from "@/lib/repositories/types"

// Importing downloads and stores. Nothing from a repository is ever run:
// file contents are only decoded as text and written to local storage.

const MAX_FILES = 3000
const MAX_TEXT_BYTES = 1024 * 1024
const CONCURRENCY = 8

export interface ImportProgress {
  done: number
  total: number
  /** the file most recently finished */
  path: string
}

export interface ImportSummary {
  files: number
  directories: number
  markdown: number
  code: number
  images: number
  other: number
  /** files whose text could not be downloaded */
  failed: number
}

/** Looks a repository up from a URL or "owner/name". */
export async function analyzeRepository(
  input: string,
  signal?: AbortSignal
): Promise<RemoteRepository> {
  const provider = providerFor({ provider: "github" })
  const ref = provider.parse(input)
  if (!ref) {
    throw new RepositoryError(
      "invalid-url",
      "Enter a GitHub repository URL, like https://github.com/owner/name."
    )
  }

  const remote = await provider.describe(ref, signal)
  const fileCount = remote.entries.filter(
    (entry) => entry.type === "file"
  ).length
  if (fileCount === 0) {
    throw new RepositoryError("empty", "That repository has no files.")
  }
  if (fileCount > MAX_FILES) {
    throw new RepositoryError(
      "too-large",
      `That repository has ${fileCount.toLocaleString()} files. Node imports up to ${MAX_FILES.toLocaleString()}.`
    )
  }
  return remote
}

/** A NUL byte near the start is the usual sign of a binary file. */
function looksBinary(bytes: Uint8Array) {
  const limit = Math.min(bytes.length, 8000)
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) {
      return true
    }
  }
  return false
}

/**
 * Downloads the repository's text files and stores the snapshot. Images and
 * binaries are listed in the tree but not downloaded here.
 */
export async function importRepository(
  remote: RemoteRepository,
  options: {
    onProgress?: (progress: ImportProgress) => void
    signal?: AbortSignal
    /** keep the original import date when re-importing */
    previous?: RepositorySource
  } = {}
): Promise<{ source: RepositorySource; summary: ImportSummary }> {
  const { onProgress, signal, previous } = options
  const provider = providerFor(remote)
  const { entries, ...details } = remote

  const files: RepositoryFile[] = entries.map((entry) =>
    entry.type === "directory"
      ? {
          path: entry.path,
          name: baseName(entry.path),
          kind: "directory",
          stored: false,
        }
      : {
          path: entry.path,
          name: baseName(entry.path),
          ...classifyFile(entry.path),
          size: entry.size,
          stored: false,
        }
  )

  const wanted = files.filter(
    (file) =>
      (file.size ?? 0) <= MAX_TEXT_BYTES &&
      (file.kind === "markdown" ||
        file.kind === "code" ||
        file.kind === "text" ||
        (file.kind === "binary" && mayBeText(file.path)))
  )

  const texts: [string, string][] = []
  const decoder = new TextDecoder("utf-8")
  let next = 0
  let done = 0
  let failed = 0

  async function worker() {
    while (next < wanted.length) {
      const file = wanted[next]
      next += 1
      if (signal?.aborted) {
        throw new RepositoryError("cancelled", "The import was cancelled.")
      }
      try {
        const bytes = new Uint8Array(
          await provider.fetchFile(details, file.path, signal)
        )
        if (looksBinary(bytes)) {
          file.kind = "binary"
        } else {
          if (file.kind === "binary") {
            file.kind = "text"
          }
          file.stored = true
          texts.push([file.path, decoder.decode(bytes)])
        }
      } catch (error) {
        if (error instanceof RepositoryError && error.code === "cancelled") {
          throw error
        }
        // One unreadable file should not sink the whole import.
        failed += 1
      }
      done += 1
      onProgress?.({ done, total: wanted.length, path: file.path })
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (signal?.aborted) {
    throw new RepositoryError("cancelled", "The import was cancelled.")
  }
  if (wanted.length > 0 && failed === wanted.length) {
    throw new RepositoryError(
      "network",
      "None of the repository's files could be downloaded. Check your connection and try again."
    )
  }

  const count = (kind: RepositoryFile["kind"]) =>
    files.filter((file) => file.kind === kind).length
  const summary: ImportSummary = {
    files: files.length - count("directory"),
    directories: count("directory"),
    markdown: count("markdown"),
    code: count("code"),
    images: count("image"),
    other: count("text") + count("binary"),
    failed,
  }

  const now = new Date().toISOString()
  const source: RepositorySource = {
    ...details,
    fileCount: summary.files,
    directoryCount: summary.directories,
    importedAt: previous?.importedAt ?? now,
    lastSyncedAt: previous ? now : undefined,
  }

  await saveSnapshot(source, files, texts)
  return { source, summary }
}

/** Fetches the repository's current state and replaces the local snapshot. */
export async function syncRepository(source: RepositorySource) {
  const remote = await analyzeRepository(source.fullName)
  return importRepository(remote, { previous: source })
}
