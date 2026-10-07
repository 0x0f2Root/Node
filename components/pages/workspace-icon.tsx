import {
  BookOpenIcon,
  BoxIcon,
  BugIcon,
  CloudIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  HomeIcon,
  LayersIcon,
  NetworkIcon,
  ServerIcon,
  ShieldIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react"

/** The icons a workspace can carry. The stored value is the id. */
export const WORKSPACE_ICONS: {
  id: string
  label: string
  icon: LucideIcon
}[] = [
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "shield", label: "Shield", icon: ShieldIcon },
  { id: "terminal", label: "Terminal", icon: TerminalIcon },
  { id: "server", label: "Server", icon: ServerIcon },
  { id: "network", label: "Network", icon: NetworkIcon },
  { id: "cloud", label: "Cloud", icon: CloudIcon },
  { id: "database", label: "Database", icon: DatabaseIcon },
  { id: "box", label: "Box", icon: BoxIcon },
  { id: "bug", label: "Bug", icon: BugIcon },
  { id: "flask", label: "Flask", icon: FlaskConicalIcon },
  { id: "book", label: "Book", icon: BookOpenIcon },
  { id: "home", label: "Home", icon: HomeIcon },
]

export const DEFAULT_WORKSPACE_ICON = "layers"

export function WorkspaceIcon({
  icon,
  className,
}: {
  icon: string | null | undefined
  className?: string
}) {
  const Icon =
    WORKSPACE_ICONS.find((option) => option.id === icon)?.icon ?? LayersIcon
  return <Icon className={className} aria-hidden="true" />
}
