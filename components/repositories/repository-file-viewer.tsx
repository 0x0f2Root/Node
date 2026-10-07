"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"

import { RepositoryCodeViewer } from "@/components/repositories/repository-code-viewer"
import { GitHubMark } from "@/components/repositories/github-mark"
import { Badge } from "@/components/reui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { imageUrl, providerFor, readFile } from "@/lib/repositories/store"
import {
  formatBytes,
  type RepositoryFile,
  type RepositorySource,
} from "@/lib/repositories/types"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileQuestionIcon,
} from "lucide-react"

// The Markdown preview pulls in the editor engine; load it only when a
// Markdown file is opened.
const RepositoryMarkdownViewer = dynamic(
  () =>
    import("@/components/repositories/repository-markdown-viewer").then(
      (mod) => mod.RepositoryMarkdownViewer
    ),
  { ssr: false, loading: () => <ContentSkeleton /> }
)

function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to the clipboard")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {copied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}

function Unavailable({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Empty className="rounded-lg border py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestionIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ImageView({
  source,
  file,
}: {
  source: RepositorySource
  file: RepositoryFile
}) {
  const [state, setState] = React.useState<{
    path: string
    url: string | null
  } | null>(null)

  React.useEffect(() => {
    let current = true
    imageUrl(source, file.path)
      .then((url) => current && setState({ path: file.path, url }))
      .catch(() => current && setState({ path: file.path, url: null }))
    return () => {
      current = false
    }
  }, [source, file.path])

  if (state?.path !== file.path) {
    return <Skeleton className="h-64 w-full" />
  }
  if (!state.url) {
    return (
      <Unavailable
        title="Image not available offline"
        description="Images are downloaded the first time they are viewed. Reconnect and open it again."
      />
    )
  }
  return (
    <div className="flex justify-center rounded-lg border bg-muted/30 p-4">
      {/* An <img> never runs scripts, including inside an SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.url}
        alt={file.name}
        className="max-h-[70svh] max-w-full object-contain"
      />
    </div>
  )
}

/**
 * One repository file: a header with its actions, then the content in the
 * viewer that fits its type. Everything here is read-only, and nothing in a
 * file is ever executed.
 */
export function RepositoryFileViewer({
  source,
  file,
  files,
}: {
  source: RepositorySource
  file: RepositoryFile
  files: RepositoryFile[]
}) {
  const provider = providerFor(source)
  const [loaded, setLoaded] = React.useState<{
    path: string
    text: string | undefined
  } | null>(null)
  const [view, setView] = React.useState<"preview" | "source">("preview")

  React.useEffect(() => {
    if (!file.stored) {
      return
    }
    let current = true
    readFile(source.id, file.path)
      .catch(() => undefined)
      .then((text) => current && setLoaded({ path: file.path, text }))
    return () => {
      current = false
    }
  }, [source.id, file.path, file.stored])

  const ready = loaded?.path === file.path
  const text = ready ? loaded.text : undefined

  async function download() {
    try {
      if (text !== undefined) {
        save(new Blob([text], { type: "text/plain;charset=utf-8" }), file.name)
        return
      }
      const bytes = await provider.fetchFile(source, file.path)
      save(new Blob([bytes]), file.name)
    } catch {
      toast.error("Download failed", {
        description:
          "This file is not stored locally and GitHub could not be reached.",
      })
    }
  }

  let body: React.ReactNode
  if (file.kind === "image") {
    body = <ImageView source={source} file={file} />
  } else if (!file.stored) {
    body =
      file.kind === "binary" ? (
        <Unavailable
          title="Unsupported file type"
          description="Node cannot display this file. Download it or open it on GitHub."
        />
      ) : (
        <Unavailable
          title="Not stored locally"
          description="This file is larger than 1 MB or could not be downloaded during import. Download it or open it on GitHub."
        />
      )
  } else if (!ready) {
    body = <ContentSkeleton />
  } else if (text === undefined) {
    body = (
      <Unavailable
        title="File missing from the snapshot"
        description="Sync the repository to download it again."
      />
    )
  } else if (file.kind === "markdown" && view === "preview") {
    body = (
      <RepositoryMarkdownViewer
        key={file.path}
        source={source}
        file={file}
        files={files}
        content={text}
      />
    )
  } else {
    body = <RepositoryCodeViewer code={text} language={file.highlight} />
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {file.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {file.language ? <span>{file.language}</span> : null}
            {file.size !== undefined ? (
              <span>{formatBytes(file.size)}</span>
            ) : null}
            <Badge variant="outline" size="sm">
              Read-only
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {file.kind === "markdown" && text !== undefined ? (
            <Tabs
              value={view}
              onValueChange={(next) => setView(next as "preview" | "source")}
            >
              <TabsList aria-label="View">
                <TabsTrigger value="preview" className="px-3">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="source" className="px-3">
                  Source
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          {text !== undefined ? <CopyButton text={text} /> : null}
          <Button variant="outline" size="sm" onClick={() => void download()}>
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
          <a
            href={provider.webUrl(source, file.path, "file")}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <GitHubMark className="size-3.5" />
            Open on GitHub
          </a>
        </div>
      </header>
      {body}
    </div>
  )
}
