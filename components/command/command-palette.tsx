"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import { useTheme } from "next-themes"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { usePageActions } from "@/components/pages/use-page-actions"
import { usePageParams } from "@/components/pages/use-page-params"
import { runReload } from "@/components/project/project-actions"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { BeamSearch } from "@/components/spectrumui/beam-search"
import { useRecents } from "@/lib/pages/recents"
import { loadAllContent, usePagesState } from "@/lib/pages/store"
import { pageHref, pagePath } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import {
  openImportDialog,
  providerFor,
  useLoadedTrees,
  useRepositories,
} from "@/lib/repositories/store"
import { repositoryHref } from "@/lib/repositories/types"
import { searchPages } from "@/lib/search/search"
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FolderGit2Icon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderInputIcon,
  CalendarDaysIcon,
  HomeIcon,
  LayersIcon,
  ListPlusIcon,
  SquareKanbanIcon,
  PencilIcon,
  SearchIcon,
  SettingsIcon,
  SquarePenIcon,
  StarIcon,
  SunMoonIcon,
  Trash2Icon,
  UploadIcon,
  type LucideIcon,
  RefreshCwIcon,
} from "lucide-react"

type CommandGroupName = "Navigation" | "Pages" | "Application"

interface PaletteCommand {
  id: string
  group: CommandGroupName
  label: string
  icon: LucideIcon
  keywords?: string
  run: () => void
}

interface PageResult {
  page: Page
  path: string
  snippet?: string
}

const GROUPS: CommandGroupName[] = ["Navigation", "Pages", "Application"]
const PAGE_LIMIT = 7
const REPOSITORY_FILE_LIMIT = 6

// The timestamp makes each "New Task" request distinct, so it also opens the
// dialog when the Tasks page is already showing.
function newTaskHref() {
  return `/tasks?new=${Date.now()}`
}

function matches(command: PaletteCommand, terms: string[]) {
  const haystack = `${command.label} ${command.keywords ?? ""}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

/** The global command palette: jump to a page or run a command. */
export function CommandPalette() {
  const router = useRouter()
  const params = usePageParams<{ pageId?: string; repositoryId?: string }>()
  const { commandOpen, setCommandOpen, importMarkdown } = useWorkspaceUI()
  const { pages } = usePagesState()
  const recents = useRecents()
  const actions = usePageActions()
  const { resolvedTheme, setTheme } = useTheme()
  const [query, setQuery] = React.useState("")

  const needle = query.trim()
  const searching = commandOpen && needle !== ""

  // Matching body text needs every file read once; titles match at once.
  React.useEffect(() => {
    if (searching) {
      void loadAllContent()
    }
  }, [searching])
  const current = params.pageId
    ? pages.find((page) => page.id === params.pageId)
    : undefined

  // Imported repositories: the one on screen, and files matching by path.
  const repositories = useRepositories()
  const trees = useLoadedTrees(commandOpen && needle !== "")
  const repository = params.repositoryId
    ? repositories.find(
        (source) => source.id === decodeURIComponent(params.repositoryId ?? "")
      )
    : undefined
  const fileResults = React.useMemo(() => {
    const term = needle.toLowerCase()
    if (!term) {
      return []
    }
    const found: { key: string; name: string; path: string; href: string }[] =
      []
    for (const source of repositories) {
      for (const file of trees[source.id] ?? []) {
        if (
          file.kind !== "directory" &&
          file.path.toLowerCase().includes(term)
        ) {
          found.push({
            key: `${source.id}/${file.path}`,
            name: source.name,
            path: file.path,
            href: repositoryHref(source.id, file.path),
          })
          if (found.length >= REPOSITORY_FILE_LIMIT) {
            return found
          }
        }
      }
    }
    return found
  }, [needle, repositories, trees])

  const pageResults = React.useMemo<PageResult[]>(() => {
    if (needle) {
      return searchPages(pages, needle, PAGE_LIMIT).map((result) => ({
        page: result.page,
        path: result.path,
        snippet: result.snippet,
      }))
    }
    return recents
      .map((visit) => pages.find((page) => page.id === visit.id))
      .filter((page): page is Page => page !== undefined)
      .slice(0, 5)
      .map((page) => ({ page, path: pagePath(pages, page.id) }))
  }, [needle, pages, recents])

  const commands: PaletteCommand[] = [
    {
      id: "search",
      group: "Navigation",
      label: needle ? `Search all pages for “${needle}”` : "Search",
      icon: SearchIcon,
      keywords: "search find",
      run: () =>
        router.push(
          needle ? `/search?q=${encodeURIComponent(needle)}` : "/search"
        ),
    },
    {
      id: "home",
      group: "Navigation",
      label: "Go Home",
      icon: HomeIcon,
      run: () => router.push("/"),
    },
    {
      id: "recent",
      group: "Navigation",
      label: "Recent",
      icon: ClockIcon,
      keywords: "history opened",
      run: () => router.push("/#recent"),
    },
    {
      id: "favorites",
      group: "Navigation",
      label: "Favorites",
      icon: StarIcon,
      keywords: "starred",
      run: () => router.push("/#favorites"),
    },
    {
      id: "all-pages",
      group: "Navigation",
      label: "All pages",
      icon: LayersIcon,
      keywords: "workspace",
      run: () => router.push("/workspace"),
    },
    {
      id: "calendar",
      group: "Navigation",
      label: "Calendar",
      icon: CalendarDaysIcon,
      keywords: "events schedule",
      run: () => router.push("/calendar"),
    },
    {
      id: "tasks",
      group: "Navigation",
      label: "Open Tasks",
      icon: SquareKanbanIcon,
      keywords: "kanban board todo",
      run: () => router.push("/tasks"),
    },
    {
      id: "new-task",
      group: "Application",
      label: "New Task",
      icon: ListPlusIcon,
      keywords: "create add todo kanban",
      run: () => router.push(newTaskHref()),
    },
    {
      id: "new-page",
      group: "Pages",
      label: "New Page",
      icon: SquarePenIcon,
      keywords: "create add",
      run: () => void actions.create(null),
    },
    {
      id: "new-workspace",
      group: "Pages",
      label: "New Workspace",
      icon: LayersIcon,
      keywords: "create add project area",
      run: () => actions.createWorkspace(),
    },
    ...(current
      ? ([
          {
            id: "new-child",
            group: "Pages",
            label: "New Folder",
            icon: FilePlusIcon,
            keywords: "create add directory group",
            run: () => void actions.createFolder(null),
          },
          {
            id: "rename",
            group: "Pages",
            label: "Rename",
            icon: PencilIcon,
            keywords: "title",
            run: () => actions.rename(current.id),
          },
          {
            id: "duplicate",
            group: "Pages",
            label: "Duplicate",
            icon: CopyIcon,
            keywords: "copy",
            run: () => void actions.duplicate(current.id),
          },
          {
            id: "favorite",
            group: "Pages",
            label: current.favorite ? "Remove from Favorites" : "Favorite",
            icon: StarIcon,
            keywords: "star pin",
            run: () => void actions.toggleFavorite(current),
          },
          {
            id: "move",
            group: "Pages",
            label: "Move",
            icon: FolderInputIcon,
            keywords: "parent nest",
            run: () => actions.move(current.id),
          },
          {
            id: "export",
            group: "Pages",
            label: "Export Markdown",
            icon: DownloadIcon,
            keywords: "download md save",
            run: () => actions.exportAs(current, "md"),
          },
          {
            id: "delete",
            group: "Pages",
            label: "Delete",
            icon: Trash2Icon,
            keywords: "remove trash",
            run: () => actions.remove(current.id),
          },
        ] satisfies PaletteCommand[])
      : []),
    ...(repository
      ? ([
          {
            id: "repository-search",
            group: "Navigation",
            label: "Search Current Repository",
            icon: SearchIcon,
            keywords: `find ${repository.name}`,
            run: () => router.push(`${repositoryHref(repository.id)}?search=1`),
          },
          {
            id: "repository-readme",
            group: "Navigation",
            label: "Open Repository README",
            icon: BookOpenIcon,
            keywords: `overview ${repository.name}`,
            run: () => router.push(repositoryHref(repository.id)),
          },
          {
            id: "repository-github",
            group: "Navigation",
            label: "Open Repository on GitHub",
            icon: ExternalLinkIcon,
            keywords: `remote ${repository.name}`,
            run: () =>
              window.open(
                providerFor(repository).webUrl(repository, "", "directory"),
                "_blank",
                "noopener,noreferrer"
              ),
          },
        ] satisfies PaletteCommand[])
      : []),
    {
      id: "reload-pages",
      group: "Application",
      label: "Reload Pages from Disk",
      icon: RefreshCwIcon,
      keywords: "refresh rescan files external changes",
      run: () => void runReload(),
    },
    {
      id: "import-repository",
      group: "Application",
      label: "Import GitHub Repository",
      icon: FolderGit2Icon,
      keywords: "repo clone source code",
      run: () => openImportDialog(),
    },
    {
      id: "import",
      group: "Application",
      label: "Import Markdown",
      icon: UploadIcon,
      keywords: "upload file md mdx",
      run: importMarkdown,
    },
    {
      id: "theme",
      group: "Application",
      label: "Toggle Theme",
      icon: SunMoonIcon,
      keywords: "dark light appearance mode",
      run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
    {
      id: "settings",
      group: "Application",
      label: "Settings",
      icon: SettingsIcon,
      keywords: "preferences options",
      run: () => router.push("/settings"),
    },
  ]

  const terms = needle.toLowerCase().split(/\s+/).filter(Boolean)
  const visible = commands.filter(
    (command) => command.id === "search" || matches(command, terms)
  )

  function close() {
    setCommandOpen(false)
    setQuery("")
  }

  function run(action: () => void) {
    close()
    action()
  }

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => (open ? setCommandOpen(true) : close())}
      title="Command palette"
      description="Search pages or run a command."
      className="sm:max-w-xl"
    >
      {/* Filtering is done here: page results come from full-text search,
          which cmdk's label matching would otherwise discard. */}
      <Command shouldFilter={false}>
        {/* The beam field wraps the command menu's own input, so arrow keys,
            Enter and the screen-reader wiring keep working. */}
        <div className="p-2 pb-1">
          <BeamSearch
            value={query}
            onChange={setQuery}
            placeholder="Search pages or type a command…"
            inputComponent={CommandPrimitive.Input}
          />
        </div>
        <CommandList className="max-h-[min(26rem,60vh)]">
          <CommandEmpty>Nothing found.</CommandEmpty>

          {pageResults.length > 0 ? (
            <CommandGroup heading={needle ? "Pages found" : "Recent"}>
              {pageResults.map(({ page, path, snippet }) => (
                <CommandItem
                  key={page.id}
                  value={`page-${page.id}`}
                  onSelect={() => run(() => router.push(pageHref(page.id)))}
                >
                  <FileTextIcon className="mt-0.5 self-start" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate">{pageTitle(page)}</span>
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {path}
                      </span>
                    </span>
                    {snippet ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {snippet}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {fileResults.length > 0 ? (
            <CommandGroup heading="Repository files">
              {fileResults.map((file) => (
                <CommandItem
                  key={file.key}
                  value={`repository-file-${file.key}`}
                  onSelect={() => run(() => router.push(file.href))}
                >
                  <FileCodeIcon />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate font-mono text-[13px]">
                      {file.path}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {file.name}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {GROUPS.map((group) => {
            const items = visible.filter((command) => command.group === group)
            if (items.length === 0) {
              return null
            }
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={`command-${command.id}`}
                    onSelect={() => run(command.run)}
                  >
                    <command.icon />
                    <span>{command.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
