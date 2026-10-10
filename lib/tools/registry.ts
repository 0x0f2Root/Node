import { BinaryIcon, TerminalIcon, type LucideIcon } from "lucide-react"

/**
 * A utility in Node's Tools area. The sidebar, the breadcrumbs and the
 * command palette all read this list, so a new tool is one entry here plus
 * its route under app/(app)/tools/.
 */
export interface ToolDefinition {
  id: string
  name: string
  description: string
  href: string
  icon: LucideIcon
  /** extra words the command palette should match */
  keywords?: string
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: "data-encoding",
    name: "Data Encoding",
    description:
      "Encode and decode common data formats used during security testing, development, and technical analysis.",
    href: "/tools/data-encoding",
    icon: BinaryIcon,
    keywords: "base64 url hex html base32 binary ascii unicode jwt decode",
  },
  {
    id: "reverse-shell",
    name: "Reverse Shell",
    description:
      "Generate common reverse shell payloads for authorized security testing, CTFs, labs, and technical environments.",
    href: "/tools/reverse-shell",
    icon: TerminalIcon,
    keywords:
      "revshell payload bash netcat python php powershell perl ruby socat lhost lport",
  },
]

/** The tool a path belongs to, if any. */
export function toolForPath(pathname: string): ToolDefinition | undefined {
  return TOOLS.find(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`)
  )
}
