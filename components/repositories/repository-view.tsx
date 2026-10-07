"use client"

import * as React from "react"
import Link from "next/link"

import { GitHubMark } from "@/components/repositories/github-mark"
import { RepositoryFileViewer } from "@/components/repositories/repository-file-viewer"
import { RepositorySearch } from "@/components/repositories/repository-search"
import {
  RemoveRepositoryDialog,
  RepositoryFileIcon,
  indexDirectories,
  syncWithFeedback,
} from "@/components/repositories/repository-tree"
import { Badge } from "@/components/reui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  openImportDialog,
  providerFor,
  useRepositories,
  useRepositoryFiles,
} from "@/lib/repositories/store"
import {
  formatBytes,
  repositoryHref,
  type RepositoryFile,
  type RepositorySource,
} from "@/lib/repositories/types"
import { useEditorSettings } from "@/lib/settings/store"
import { cn } from "@/lib/utils"
import { useHydrated } from "@/lib/utils/client"
import { formatRelativeTime, useNow } from "@/lib/utils/time"
import {
  FileQuestionIcon,
  GitBranchIcon,
  GitForkIcon,
  RefreshCwIcon,
  StarIcon,
} from "lucide-react"

const README = /^readme(\.(md|mdx|markdown))?$/i

function Missing({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestionIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  )
}

/** The entries of one directory, as compact rows. */
function DirectoryListing({
  source,
  entries,
}: {
  source: RepositorySource
  entries: RepositoryFile[]
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This folder is empty.</p>
    )
  }
  return (
    <ul className="divide-y rounded-lg border">
      {entries.map((entry) => (
        <li key={entry.path}>
          <Link
            href={repositoryHref(source.id, entry.path)}
            className="flex items-center gap-3 px-3 py-2 text-sm outline-none first:rounded-t-lg last:rounded-b-lg hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <RepositoryFileIcon
              kind={entry.kind}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {entry.kind === "directory" ? "" : formatBytes(entry.size)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Overview({
  source,
  files,
  autoFocusSearch,
  initialQuery,
}: {
  source: RepositorySource
  files: RepositoryFile[]
  autoFocusSearch: boolean
  initialQuery: string
}) {
  const now = useNow()
  const [removing, setRemoving] = React.useState(false)
  const index = React.useMemo(() => indexDirectories(files), [files])
  const root = index.get("") ?? []
  const readme = root.find(
    (entry) => entry.kind === "markdown" && README.test(entry.name)
  )
  const stamp = source.lastSyncedAt ?? source.importedAt

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitHubMark />
          GitHub
          <Badge variant="outline" size="sm">
            Imported
          </Badge>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          <span className="font-normal text-muted-foreground">
            {source.owner} /{" "}
          </span>
          {source.name}
        </h1>
        {source.description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {source.description}
          </p>
        ) : null}

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <dt className="sr-only">Branch</dt>
            <GitBranchIcon className="size-3.5" aria-hidden="true" />
            <dd>{source.branch}</dd>
          </div>
          {source.language ? (
            <div>
              <dt className="sr-only">Language</dt>
              <dd>{source.language}</dd>
            </div>
          ) : null}
          {source.license ? (
            <div>
              <dt className="sr-only">License</dt>
              <dd>{source.license}</dd>
            </div>
          ) : null}
          {source.stars !== undefined ? (
            <div className="flex items-center gap-1">
              <dt className="sr-only">Stars</dt>
              <StarIcon className="size-3.5" aria-hidden="true" />
              <dd>{source.stars.toLocaleString()}</dd>
            </div>
          ) : null}
          {source.forks !== undefined ? (
            <div className="flex items-center gap-1">
              <dt className="sr-only">Forks</dt>
              <GitForkIcon className="size-3.5" aria-hidden="true" />
              <dd>{source.forks.toLocaleString()}</dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Files</dt>
            <dd>{source.fileCount.toLocaleString()} files</dd>
          </div>
          <div>
            <dt className="sr-only">
              {source.lastSyncedAt ? "Last synced" : "Imported"}
            </dt>
            <dd>
              {now
                ? `${source.lastSyncedAt ? "Synced" : "Imported"} ${formatRelativeTime(
                    new Date(stamp),
                    now
                  )}`
                : ""}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={providerFor(source).webUrl(source, "", "directory")}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <GitHubMark className="size-3.5" />
            Open on GitHub
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncWithFeedback(source)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Sync
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setRemoving(true)}
          >
            Remove
          </Button>
        </div>
      </header>

      <RepositorySearch
        source={source}
        files={files}
        initialQuery={initialQuery}
        autoFocus={autoFocusSearch}
      />

      <section
        aria-labelledby="repository-structure"
        className="flex flex-col gap-3"
      >
        <h2
          id="repository-structure"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Repository structure
        </h2>
        <DirectoryListing source={source} entries={root} />
      </section>

      {readme ? (
        <section aria-label="README" className="border-t pt-8">
          <RepositoryFileViewer source={source} file={readme} files={files} />
        </section>
      ) : null}

      <RemoveRepositoryDialog
        source={removing ? source : null}
        onClose={() => setRemoving(false)}
      />
    </div>
  )
}

/**
 * A repository route: the overview at its root, a listing for a folder, or
 * the viewer for a file. Everything is read from the local snapshot.
 */
export function RepositoryView({
  repositoryId,
  path,
  search,
  query,
}: {
  repositoryId: string
  /** "" for the repository root */
  path: string
  /** focus the repository search on arrival */
  search: boolean
  query: string
}) {
  const repositories = useRepositories()
  const hydrated = useHydrated()
  const source = repositories.find((item) => item.id === repositoryId)
  const files = useRepositoryFiles(source ? source.id : null)
  const { editorWidth } = useEditorSettings()

  // Repository pages follow the same Page width setting as documents.
  const frame = cn(
    "mx-auto w-full px-6 pt-8 pb-32 sm:px-10 md:pt-12",
    editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-[56rem]"
  )

  if (!hydrated || (source && files === undefined)) {
    return (
      <div className={frame} aria-busy="true">
        <Skeleton className="mb-3 h-8 w-2/5" />
        <Skeleton className="mb-8 h-3 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!source || !files) {
    return (
      <Missing
        title="Repository not found"
        description="It may have been removed from Node, or imported in another browser."
      >
        <Button size="sm" onClick={() => openImportDialog()}>
          Import from GitHub
        </Button>
      </Missing>
    )
  }

  if (!path) {
    return (
      <div className={frame}>
        <Overview
          source={source}
          files={files}
          autoFocusSearch={search}
          initialQuery={query}
        />
      </div>
    )
  }

  const entry = files.find((file) => file.path === path)
  if (!entry) {
    return (
      <Missing
        title="File not found"
        description={`${path} is not in the local snapshot of ${source.name}.`}
      >
        <Link
          href={repositoryHref(source.id)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to {source.name}
        </Link>
      </Missing>
    )
  }

  if (entry.kind === "directory") {
    return (
      <div className={frame}>
        <DirectoryView source={source} files={files} directory={entry} />
      </div>
    )
  }

  return (
    <div className={frame}>
      <RepositoryFileViewer
        key={entry.path}
        source={source}
        file={entry}
        files={files}
      />
    </div>
  )
}

function DirectoryView({
  source,
  files,
  directory,
}: {
  source: RepositorySource
  files: RepositoryFile[]
  directory: RepositoryFile
}) {
  const index = React.useMemo(() => indexDirectories(files), [files])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
          <RepositoryFileIcon
            kind="directory"
            open
            className="size-5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{directory.name}</span>
        </h1>
        <a
          href={providerFor(source).webUrl(source, directory.path, "directory")}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <GitHubMark className="size-3.5" />
          Open on GitHub
        </a>
      </header>
      <DirectoryListing
        source={source}
        entries={index.get(directory.path) ?? []}
      />
    </div>
  )
}
