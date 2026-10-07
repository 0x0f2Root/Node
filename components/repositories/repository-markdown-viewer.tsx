"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  MdxEditor,
  useEditorMode,
  type MediaProvider,
} from "@fumadocs-editor/ui"

import { RepositoryCodeViewer } from "@/components/repositories/repository-code-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { imageUrl, providerFor } from "@/lib/repositories/store"
import {
  repositoryHref,
  resolveRepositoryPath,
  type RepositoryFile,
  type RepositorySource,
} from "@/lib/repositories/types"

const IMAGE_REFERENCE =
  /!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img[^>]+src=["']([^"']+)["']/gi

/** Every image reference in a Markdown source, as written. */
function imageReferences(markdown: string): string[] {
  const found = new Set<string>()
  for (const match of markdown.matchAll(IMAGE_REFERENCE)) {
    const reference = match[1] ?? match[2]
    if (reference) {
      found.add(reference)
    }
  }
  return [...found]
}

function attribute(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]
}

/** The HTML-in-Markdown habits of READMEs, rewritten as plain Markdown. */
function relaxProse(text: string): string {
  return (
    text
      .replace(/<!--[\s\S]*?-->/g, "")
      // <img src alt> becomes a Markdown image, so it resolves like one.
      .replace(/<img\b[^>]*>/gi, (tag) => {
        const src = attribute(tag, "src")
        return src ? `![${attribute(tag, "alt") ?? ""}](${src})` : ""
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
      // Purely presentational wrappers: keep what is inside them.
      .replace(
        /<\/?(?:p|div|span|center|picture|sub|sup|kbd|samp)\b[^>]*>/gi,
        ""
      )
      .replace(/<source\b[^>]*>/gi, "")
      .replace(
        /<h([1-6])\b[^>]*>/gi,
        (_, level: string) => `\n\n${"#".repeat(Number(level))} `
      )
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (tag, inner: string) => {
        const href = attribute(tag, "href")
        return href ? `[${inner.trim()}](${href})` : inner
      })
      .replace(/<(https?:\/\/[^>\s]+)>/gi, "[$1]($1)")
      // Braces start an expression in MDX.
      .replace(/[{}]/g, "\\$&")
  )
}

// Last line of defence: if the editor still fails on a document, show its
// source instead of taking the whole page down.
class PreviewBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function SourceFallback({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        This file uses Markdown that the preview cannot render, so its source is
        shown.
      </p>
      <RepositoryCodeViewer code={source} language="markdown" />
    </div>
  )
}

/**
 * Prepares a repository's Markdown for the preview. The editor reads MDX,
 * which is stricter than the Markdown most READMEs are written in. Code
 * blocks and inline code are left exactly as they are. Only the preview uses
 * this; the stored file and the Source view are untouched.
 */
function toPreviewSource(markdown: string): string {
  return markdown
    .split(/(^```[\s\S]*?^```[^\n]*$|^~~~[\s\S]*?^~~~[^\n]*$)/m)
    .map((block, blockIndex) =>
      blockIndex % 2 === 1
        ? block
        : block
            .split(/(`+[^`\n]*`+)/)
            .map((part, partIndex) =>
              partIndex % 2 === 1 ? part : relaxProse(part)
            )
            .join("")
    )
    .join("")
}

// Markdown that still is not valid MDX cannot be rendered by the editor. Its
// source is shown instead of a broken page.
function Rendered({ source }: { source: string }) {
  const { canShowVisual } = useEditorMode()
  if (!canShowVisual) {
    return <SourceFallback source={source} />
  }
  return (
    <div className="-mx-6">
      <MdxEditor.Visual />
    </div>
  )
}

/**
 * A repository's Markdown file, rendered read-only with Node's own editor
 * engine. Relative images resolve to the repository's files, and relative
 * links open the linked file inside Node.
 */
export function RepositoryMarkdownViewer({
  source,
  file,
  files,
  content,
}: {
  source: RepositorySource
  file: RepositoryFile
  files: RepositoryFile[]
  content: string
}) {
  const router = useRouter()
  // reference as written -> displayable URL
  const [images, setImages] = React.useState<Record<string, string> | null>(
    null
  )

  React.useEffect(() => {
    let current = true
    const paths = new Set(files.map((entry) => entry.path))

    Promise.all(
      imageReferences(content).map(async (reference) => {
        const path = resolveRepositoryPath(file.path, reference)
        if (path === null || !paths.has(path)) {
          return null
        }
        try {
          return [reference, await imageUrl(source, path)] as const
        } catch {
          // Offline and never viewed: fall back to the remote URL.
          return [reference, providerFor(source).rawUrl(source, path)] as const
        }
      })
    ).then((entries) => {
      if (current) {
        setImages(Object.fromEntries(entries.filter((entry) => entry !== null)))
      }
    })

    return () => {
      current = false
    }
  }, [content, file.path, files, source])

  const media = React.useMemo<MediaProvider>(
    () => ({
      // Read-only: nothing is ever uploaded into a repository snapshot.
      upload: () => Promise.reject(new Error("This file is read-only.")),
      resolve: (reference) => images?.[reference] ?? reference,
    }),
    [images]
  )

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor =
      event.target instanceof Element ? event.target.closest("a[href]") : null
    const href = anchor?.getAttribute("href")
    if (!href || href.startsWith("#")) {
      return
    }
    event.preventDefault()

    const path = resolveRepositoryPath(file.path, href)
    if (
      path !== null &&
      (path === "" || files.some((entry) => entry.path === path))
    ) {
      // A link to another file in the repository opens it here.
      router.push(repositoryHref(source.id, path))
      return
    }
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer")
    }
  }

  const preview = React.useMemo(() => toPreviewSource(content), [content])

  if (images === null) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <div onClickCapture={onClick}>
      <PreviewBoundary fallback={<SourceFallback source={content} />}>
        <MdxEditor.Root defaultValue={preview} editable={false} media={media}>
          <Rendered source={content} />
        </MdxEditor.Root>
      </PreviewBoundary>
    </div>
  )
}
