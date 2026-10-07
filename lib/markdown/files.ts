import type { Page } from "@/lib/pages/types"

export type ExportFormat = "md" | "mdx"

export const IMPORT_ACCEPT = ".md,.mdx,.markdown,text/markdown"
const MAX_IMPORT_BYTES = 5 * 1024 * 1024

/** Title for an imported file: frontmatter, then first H1, then filename. */
export function titleFromMarkdown(source: string, filename: string): string {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)
  const fromFrontmatter = frontmatter?.[1]
    ?.match(/^title:\s*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "")
  if (fromFrontmatter) {
    return fromFrontmatter
  }

  const heading = source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) {
    return heading
  }

  return filename.replace(/\.(md|mdx|markdown)$/i, "") || "Untitled"
}

/** Reads a Markdown file as text. The source is stored exactly as read. */
export async function readMarkdownFile(
  file: File
): Promise<{ title: string; content: string }> {
  if (!/\.(md|mdx|markdown)$/i.test(file.name)) {
    throw new Error(`${file.name} is not a Markdown file.`)
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`${file.name} is larger than 5 MB.`)
  }
  const content = (await file.text()).replace(/\r\n/g, "\n")
  return { title: titleFromMarkdown(content, file.name), content }
}

function filename(title: string, format: ExportFormat) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug || "untitled"}.${format}`
}

/** Downloads the page's canonical Markdown/MDX source. */
export function exportPage(page: Page, format: ExportFormat) {
  const blob = new Blob([page.content], {
    type: "text/markdown;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename(page.title, format)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
