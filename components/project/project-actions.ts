"use client"

import { toast } from "sonner"

import { copyLegacyPages } from "@/lib/pages/legacy-import"
import { loadPages } from "@/lib/pages/store"

function describeError(error: unknown) {
  return error instanceof Error ? error.message : undefined
}

function count(amount: number, word: string) {
  return `${amount} ${word}${amount === 1 ? "" : "s"}`
}

/** Reads data/pages/ again, for files changed in another program. */
export async function runReload() {
  await loadPages()
  toast.success("Pages reloaded from disk")
}

/** Copies pages still held in browser storage into data/pages/. */
export async function runCopyLegacyPages() {
  try {
    const { copied, folders, skipped } = await copyLegacyPages()
    toast.success("Migration complete", {
      description: [
        `${count(copied, "page")} migrated, ${count(folders, "folder")} created.`,
        skipped > 0
          ? `${count(skipped, "page")} left out because a file with that name already exists.`
          : null,
        "The browser copy was kept as a backup.",
      ]
        .filter(Boolean)
        .join(" "),
    })
  } catch (error) {
    toast.error("Could not migrate the pages", {
      description: describeError(error),
    })
  }
}
