"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { GitHubMark } from "@/components/repositories/github-mark"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  analyzeRepository,
  importRepository,
  type ImportProgress,
  type ImportSummary,
} from "@/lib/repositories/importer"
import {
  closeImportDialog,
  getRepositories,
  useImportDialog,
} from "@/lib/repositories/store"
import {
  RepositoryError,
  repositoryHref,
  type RemoteRepository,
  type RepositorySource,
} from "@/lib/repositories/types"
import { GitBranchIcon, GitForkIcon, StarIcon } from "lucide-react"

type Step =
  | { name: "url" }
  | { name: "analyzing" }
  | { name: "ready"; remote: RemoteRepository; existing?: RepositorySource }
  | {
      name: "importing"
      remote: RemoteRepository
      progress: ImportProgress | null
    }
  | { name: "done"; source: RepositorySource; summary: ImportSummary }

function message(error: unknown) {
  // RepositoryError messages are written for people; anything else is not
  // shown raw.
  return error instanceof RepositoryError
    ? error.message
    : "Something went wrong while talking to GitHub. Try again."
}

function RepositoryCard({ remote }: { remote: RemoteRepository }) {
  const fileCount = remote.entries.filter(
    (entry) => entry.type === "file"
  ).length

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <GitHubMark />
        <span className="min-w-0 truncate">
          <span className="font-normal text-muted-foreground">
            {remote.owner} /{" "}
          </span>
          {remote.name}
        </span>
      </p>
      {remote.description ? (
        <p className="text-sm text-muted-foreground">{remote.description}</p>
      ) : null}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <StarIcon className="size-3.5" aria-hidden="true" />
          {(remote.stars ?? 0).toLocaleString()}
          <span className="sr-only">stars</span>
        </span>
        <span className="flex items-center gap-1">
          <GitForkIcon className="size-3.5" aria-hidden="true" />
          {(remote.forks ?? 0).toLocaleString()}
          <span className="sr-only">forks</span>
        </span>
        <span className="flex items-center gap-1">
          <GitBranchIcon className="size-3.5" aria-hidden="true" />
          {remote.branch}
        </span>
        <span>{fileCount.toLocaleString()} files</span>
        {remote.license ? <span>{remote.license}</span> : null}
      </p>
    </div>
  )
}

function ImportFlow({ initialUrl }: { initialUrl: string }) {
  const router = useRouter()
  const [url, setUrl] = React.useState(initialUrl)
  const [step, setStep] = React.useState<Step>({ name: "url" })
  const [error, setError] = React.useState<string | null>(null)
  const controller = React.useRef<AbortController | null>(null)

  // Closing the dialog cancels whatever is in flight.
  React.useEffect(() => () => controller.current?.abort(), [])

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStep({ name: "analyzing" })
    controller.current = new AbortController()
    try {
      const remote = await analyzeRepository(url, controller.current.signal)
      setStep({
        name: "ready",
        remote,
        existing: getRepositories().find((source) => source.id === remote.id),
      })
    } catch (failure) {
      if (!(
        failure instanceof RepositoryError && failure.code === "cancelled"
      )) {
        setError(message(failure))
      }
      setStep({ name: "url" })
    }
  }

  async function start(remote: RemoteRepository, existing?: RepositorySource) {
    setError(null)
    setStep({ name: "importing", remote, progress: null })
    controller.current = new AbortController()
    try {
      const result = await importRepository(remote, {
        signal: controller.current.signal,
        previous: existing,
        onProgress: (progress) =>
          setStep({ name: "importing", remote, progress }),
      })
      setStep({ name: "done", ...result })
    } catch (failure) {
      if (failure instanceof RepositoryError && failure.code === "cancelled") {
        setStep({ name: "ready", remote, existing })
        return
      }
      setError(message(failure))
      setStep({ name: "ready", remote, existing })
    }
  }

  function open(source: RepositorySource) {
    closeImportDialog()
    router.push(repositoryHref(source.id))
  }

  const alert = error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null

  if (step.name === "url" || step.name === "analyzing") {
    const busy = step.name === "analyzing"
    return (
      <form onSubmit={analyze} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Import GitHub repository</DialogTitle>
          <DialogDescription>
            Node downloads a read-only snapshot you can browse offline. Public
            repositories only; nothing in a repository is ever run.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repository-url">Repository URL</Label>
          <Input
            id="repository-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            disabled={busy}
          />
        </div>
        {alert}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeImportDialog}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || url.trim() === ""}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            {busy ? "Analyzing…" : "Analyze repository"}
          </Button>
        </DialogFooter>
      </form>
    )
  }

  if (step.name === "ready") {
    const { remote, existing } = step
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Already imported" : "GitHub repository"}
          </DialogTitle>
          <DialogDescription>
            {existing
              ? "This repository is already in Node. Re-importing replaces its local snapshot."
              : "Text files are downloaded now. Images are fetched when you first view them."}
          </DialogDescription>
        </DialogHeader>
        <RepositoryCard remote={remote} />
        {alert}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep({ name: "url" })}
          >
            Back
          </Button>
          {existing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void start(remote, existing)}
              >
                Re-import
              </Button>
              <Button type="button" onClick={() => open(existing)}>
                Open existing
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => void start(remote)}>
              Import repository
            </Button>
          )}
        </DialogFooter>
      </div>
    )
  }

  if (step.name === "importing") {
    const { progress, remote } = step
    const percent = progress
      ? Math.round((progress.done / Math.max(1, progress.total)) * 100)
      : 0
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Importing {remote.name}</DialogTitle>
          <DialogDescription>
            Downloading files. You can keep this open or cancel.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Progress value={percent} aria-label="Import progress" />
          <p className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span className="min-w-0 truncate font-mono">
              {progress?.path ?? "Starting…"}
            </span>
            <span className="shrink-0 tabular-nums">
              {progress ? `${progress.done} / ${progress.total}` : ""}
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => controller.current?.abort()}
          >
            Cancel
          </Button>
        </DialogFooter>
      </div>
    )
  }

  const { source, summary } = step
  const counts: [number, string][] = [
    [summary.files, "files"],
    [summary.directories, "folders"],
    [summary.code, "code and config files"],
    [summary.markdown, "Markdown files"],
    [summary.images, "images"],
    [summary.other, "other files"],
  ]
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Repository imported</DialogTitle>
        <DialogDescription>
          {source.fullName} is now available in the sidebar.
        </DialogDescription>
      </DialogHeader>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {counts.map(([count, label]) => (
          <li key={label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="tabular-nums">{count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      {summary.failed > 0 ? (
        <p className="text-sm text-muted-foreground">
          {summary.failed.toLocaleString()}{" "}
          {summary.failed === 1 ? "file" : "files"} could not be downloaded and
          can be opened on GitHub instead.
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={closeImportDialog}>
          Close
        </Button>
        <Button type="button" onClick={() => open(source)}>
          Open repository
        </Button>
      </DialogFooter>
    </div>
  )
}

/** Import from GitHub: URL, a look at what was found, progress, summary. */
export function RepositoryImportDialog() {
  const { open, url } = useImportDialog()
  // A fresh flow each time the dialog opens.
  const [session, setSession] = React.useState(0)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((current) => current + 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeImportDialog()}>
      <DialogContent className="sm:max-w-md">
        {open || session > 0 ? (
          <ImportFlow key={session} initialUrl={url} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
