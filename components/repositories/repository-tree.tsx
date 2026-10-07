"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { GitHubMark } from "@/components/repositories/github-mark"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { syncRepository } from "@/lib/repositories/importer"
import {
  openImportDialog,
  providerFor,
  removeRepository,
  useRepositories,
  useRepositoryFiles,
} from "@/lib/repositories/store"
import {
  parentPath,
  repositoryHref,
  type RepositoryFile,
  type RepositoryFileKind,
  type RepositorySource,
} from "@/lib/repositories/types"
import { cn } from "@/lib/utils"
import { useHydrated } from "@/lib/utils/client"
import {
  ChevronRightIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  ImageIcon,
  PlusIcon,
} from "lucide-react"

/** One quiet icon per kind of entry, not one per language. */
export function RepositoryFileIcon({
  kind,
  open = false,
  className,
}: {
  kind: RepositoryFileKind
  open?: boolean
  className?: string
}) {
  const Icon =
    kind === "directory"
      ? open
        ? FolderOpenIcon
        : FolderIcon
      : kind === "code"
        ? FileCodeIcon
        : kind === "image"
          ? ImageIcon
          : kind === "binary"
            ? FileIcon
            : FileTextIcon
  return <Icon className={className} aria-hidden="true" />
}

/** Directory path -> its entries, folders first, then by name. */
export function indexDirectories(
  files: RepositoryFile[]
): Map<string, RepositoryFile[]> {
  const index = new Map<string, RepositoryFile[]>()
  for (const file of files) {
    const parent = parentPath(file.path)
    const siblings = index.get(parent)
    if (siblings) {
      siblings.push(file)
    } else {
      index.set(parent, [file])
    }
  }
  for (const entries of index.values()) {
    entries.sort(
      (a, b) =>
        Number(b.kind === "directory") - Number(a.kind === "directory") ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
  }
  return index
}

/** Re-fetches the repository and replaces the local snapshot. */
export function syncWithFeedback(source: RepositorySource) {
  toast.promise(syncRepository(source), {
    loading: `Syncing ${source.name}…`,
    success: ({ summary }) =>
      `${source.name} synced: ${summary.files.toLocaleString()} files`,
    error: (error) =>
      error instanceof Error ? error.message : "The sync failed.",
  })
}

export function RemoveRepositoryDialog({
  source,
  onClose,
}: {
  source: RepositorySource | null
  onClose: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  // Keep the name on screen while the dialog animates closed.
  const [shown, setShown] = React.useState(source)
  if (source !== null && source !== shown) {
    setShown(source)
  }
  const current = source ?? shown

  async function remove() {
    if (!source) {
      return
    }
    const viewing = pathname.startsWith(repositoryHref(source.id))
    onClose()
    await removeRepository(source.id)
    if (viewing) {
      router.push("/")
    }
  }

  return (
    <AlertDialog
      open={source !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {current?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the local repository snapshot from Node. The GitHub
            repository will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void remove()}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Only expanded folders are rendered, so a large repository costs nothing
// until it is opened, one level at a time.
const TreeLevel = React.memo(function TreeLevel({
  repositoryId,
  directory,
  index,
  open,
  activePath,
  onToggle,
  onNavigate,
}: {
  repositoryId: string
  directory: string
  index: Map<string, RepositoryFile[]>
  /** explicit open/closed choices, by directory path */
  open: Record<string, boolean>
  activePath: string | null
  onToggle: (path: string, next: boolean) => void
  onNavigate: () => void
}) {
  const entries = index.get(directory) ?? []

  return (
    <SidebarMenuSub className="mr-0 ml-3 gap-0.5 pr-0 pl-1.5">
      {entries.map((entry) => {
        if (entry.kind !== "directory") {
          return (
            <SidebarMenuSubItem key={entry.path}>
              <SidebarMenuSubButton
                isActive={entry.path === activePath}
                render={
                  <Link
                    href={repositoryHref(repositoryId, entry.path)}
                    onClick={onNavigate}
                  />
                }
              >
                <RepositoryFileIcon
                  kind={entry.kind}
                  className="text-sidebar-foreground/50!"
                />
                <span>{entry.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          )
        }

        // A folder on the way to the open file starts expanded.
        const isOpen =
          open[entry.path] ??
          (activePath !== null && activePath.startsWith(`${entry.path}/`))
        return (
          <SidebarMenuSubItem key={entry.path}>
            <SidebarMenuSubButton
              render={<button type="button" />}
              className="w-full"
              aria-expanded={isOpen}
              onClick={() => onToggle(entry.path, !isOpen)}
            >
              <RepositoryFileIcon
                kind="directory"
                open={isOpen}
                className="text-sidebar-foreground/60!"
              />
              <span>{entry.name}</span>
            </SidebarMenuSubButton>
            {isOpen ? (
              <TreeLevel
                repositoryId={repositoryId}
                directory={entry.path}
                index={index}
                open={open}
                activePath={activePath}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            ) : null}
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
})

function RepositoryNode({
  source,
  active,
  activePath,
  onRemove,
  onNavigate,
}: {
  source: RepositorySource
  /** true while this repository is the one on screen */
  active: boolean
  activePath: string | null
  onRemove: (source: RepositorySource) => void
  onNavigate: () => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState<boolean | null>(null)
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const isOpen = expanded ?? active

  // The tree is read from local storage only once the repository is opened.
  const files = useRepositoryFiles(isOpen ? source.id : null)
  const index = React.useMemo(
    () => (files ? indexDirectories(files) : null),
    [files]
  )
  const onToggle = React.useCallback((path: string, next: boolean) => {
    setOpen((current) => ({ ...current, [path]: next }))
  }, [])

  const href = repositoryHref(source.id)
  const webUrl = providerFor(source).webUrl(source, "", "directory")

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <ContextMenuTrigger render={<div className="relative" />}>
          <SidebarMenuButton
            isActive={active && !activePath}
            className="pl-7"
            render={<Link href={href} onClick={onNavigate} />}
          >
            <GitHubMark />
            <span>{source.name}</span>
          </SidebarMenuButton>
          <button
            type="button"
            aria-label={
              isOpen ? `Collapse ${source.name}` : `Expand ${source.name}`
            }
            aria-expanded={isOpen}
            onClick={() => setExpanded(!isOpen)}
            className="absolute top-1.5 left-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/60 ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2"
          >
            <ChevronRightIcon
              className={cn(
                "size-3.5 transition-transform duration-150",
                isOpen && "rotate-90"
              )}
              aria-hidden="true"
            />
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => router.push(href)}>
            Open
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => window.open(webUrl, "_blank", "noopener,noreferrer")}
          >
            Open on GitHub
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push(`${href}?search=1`)}>
            Search repository
          </ContextMenuItem>
          <ContextMenuItem onClick={() => syncWithFeedback(source)}>
            Sync
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              void navigator.clipboard
                .writeText(webUrl)
                .then(() => toast.success("Repository URL copied"))
                .catch(() => toast.error("Could not copy the URL"))
            }
          >
            Copy repository URL
          </ContextMenuItem>
          {isOpen ? (
            <ContextMenuItem onClick={() => setExpanded(false)}>
              Collapse
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onRemove(source)}
          >
            Remove from Node
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen ? (
        index ? (
          <TreeLevel
            repositoryId={source.id}
            directory=""
            index={index}
            open={open}
            activePath={activePath}
            onToggle={onToggle}
            onNavigate={onNavigate}
          />
        ) : (
          <div className="flex flex-col gap-2.5 py-2 pl-8" aria-hidden="true">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        )
      ) : null}
    </SidebarMenuItem>
  )
}

/** The sidebar's Repositories section: imported repositories and their trees. */
export function RepositoryTree() {
  const repositories = useRepositories()
  const hydrated = useHydrated()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const [removing, setRemoving] = React.useState<RepositorySource | null>(null)

  // /repositories/<id>/<path…>
  const [, section, rawId, ...rawPath] = pathname.split("/")
  const activeId =
    section === "repositories" && rawId ? safeDecode(rawId) : null
  const activePath =
    rawPath.length > 0 ? rawPath.map(safeDecode).join("/") : null

  const onNavigate = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  return (
    <>
      <SidebarMenu>
        {hydrated
          ? repositories.map((source) => (
              <RepositoryNode
                key={source.id}
                source={source}
                active={source.id === activeId}
                activePath={source.id === activeId ? activePath : null}
                onRemove={setRemoving}
                onNavigate={onNavigate}
              />
            ))
          : null}
        <SidebarMenuItem>
          <SidebarMenuButton
            className="text-sidebar-foreground/70"
            onClick={() => {
              onNavigate()
              openImportDialog()
            }}
          >
            <PlusIcon />
            <span>Import from GitHub</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <RemoveRepositoryDialog
        source={removing}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
