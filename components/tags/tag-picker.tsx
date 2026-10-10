"use client"

import * as React from "react"
import { toast } from "sonner"

import { StyledBadge, TagBadge } from "@/components/tags/tag-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { updatePage, usePagesState } from "@/lib/pages/store"
import type { Page } from "@/lib/pages/types"
import {
  forgetTag,
  knownTagName,
  setTagStyle,
  useTagStyles,
} from "@/lib/tags/store"
import {
  DEFAULT_TAG_STYLE,
  TAG_STYLES,
  type TagStyleId,
} from "@/lib/tags/styles"
import { cn } from "@/lib/utils"
import { CheckIcon, PaletteIcon, PlusIcon, Trash2Icon } from "lucide-react"

function fail(error: unknown) {
  toast.error("Could not update the tags", {
    description: error instanceof Error ? error.message : undefined,
  })
}

/** The colours to choose from, each drawn as the badge it produces. */
function StylePicker({
  value,
  onPick,
}: {
  value?: string
  onPick: (style: TagStyleId) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tag colour"
      className="flex flex-wrap gap-1.5"
    >
      {TAG_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          role="radio"
          aria-checked={value === style.id}
          aria-label={style.label}
          title={style.label}
          onClick={() => onPick(style.id)}
          className={cn(
            "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === style.id && "ring-2 ring-ring ring-offset-1"
          )}
        >
          <StyledBadge styleId={style.id}>Aa</StyledBadge>
        </button>
      ))}
    </div>
  )
}

/**
 * Add, remove and create tags for one page. A tag is a name and a colour;
 * the names are saved in the page's file, the colours once for the project.
 */
export function TagPicker({ page }: { page: Page }) {
  const { pages } = usePagesState()
  const styles = useTagStyles()
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<string | null>(null)

  const applied = page.tags ?? []

  // Every tag in use or with a colour, and how many pages carry it.
  const usage = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const name of Object.keys(styles)) {
      counts.set(name, 0)
    }
    for (const item of pages) {
      for (const tag of item.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return counts
  }, [pages, styles])

  const typed = query.trim().replace(/\s+/g, " ")
  const all = [...usage.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )
  const visible = all.filter((tag) =>
    tag.toLowerCase().includes(typed.toLowerCase())
  )
  const exact = all.find((tag) => tag.toLowerCase() === typed.toLowerCase())

  function setTags(tags: string[]) {
    updatePage(page.id, { tags }).catch(fail)
  }

  function toggle(tag: string) {
    setTags(
      applied.includes(tag)
        ? applied.filter((item) => item !== tag)
        : [...applied, tag]
    )
  }

  function create(style: TagStyleId) {
    if (!typed) {
      return
    }
    const name = knownTagName(typed) ?? typed
    setTagStyle(name, style).catch(fail)
    if (!applied.includes(name)) {
      setTags([...applied, name])
    }
    setQuery("")
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setQuery("")
          setEditing(null)
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="xs"
            className="h-5 gap-1 px-1.5 text-xs text-muted-foreground"
          />
        }
      >
        <PlusIcon />
        {applied.length === 0 ? "Add tag" : "Tags"}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-3 p-3">
        <Input
          value={query}
          placeholder="Find or create a tag…"
          aria-label="Find or create a tag"
          autoComplete="off"
          maxLength={40}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return
            }
            event.preventDefault()
            if (exact) {
              toggle(exact)
              setQuery("")
            } else {
              create(DEFAULT_TAG_STYLE)
            }
          }}
        />

        {visible.length > 0 ? (
          <ul className="-mx-1 flex max-h-56 flex-col overflow-y-auto">
            {visible.map((tag) => {
              const checked = applied.includes(tag)
              const count = usage.get(tag) ?? 0
              return (
                <li key={tag} className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(tag)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 text-start outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <CheckIcon
                        className={cn(
                          "size-3.5 shrink-0",
                          !checked && "invisible"
                        )}
                        aria-hidden="true"
                      />
                      <TagBadge name={tag} className="max-w-40 truncate" />
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Change the colour of ${tag}`}
                      aria-expanded={editing === tag}
                      onClick={() => setEditing(editing === tag ? null : tag)}
                    >
                      <PaletteIcon />
                    </Button>
                  </div>
                  {editing === tag ? (
                    <div className="flex flex-col gap-2 px-1 pt-1 pb-2">
                      <StylePicker
                        value={styles[tag] ?? DEFAULT_TAG_STYLE}
                        onPick={(style) => setTagStyle(tag, style).catch(fail)}
                      />
                      {count === 0 ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="self-start text-muted-foreground"
                          onClick={() => {
                            forgetTag(tag).catch(fail)
                            setEditing(null)
                          }}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Delete this unused tag
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}

        {typed && !exact ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Create “{typed}”: pick a colour, or press Enter.
            </p>
            <StylePicker onPick={create} />
          </div>
        ) : all.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tags yet. Type a name such as “Web App” or “API” to create the
            first one.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
