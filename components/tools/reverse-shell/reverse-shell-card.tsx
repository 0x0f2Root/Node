"use client"

import { Badge } from "@/components/reui/badge"
import { ToolCodeBlock } from "@/components/tools/code-block"
import { generate } from "@/lib/tools/reverse-shell/catalog"
import type {
  ReverseShell,
  ReverseShellConfig,
} from "@/lib/tools/reverse-shell/types"

const PLATFORM_LABEL: Record<string, string> = {
  linux: "Linux",
  windows: "Windows",
  "cross-platform": "Cross-platform",
}

/**
 * One shell: name, platform/category badges, description and the generated
 * command. The command is derived from `config` on every render, so the copy
 * action in the code block always carries the current LHOST/LPORT.
 */
export function ReverseShellCard({
  shell,
  config,
}: {
  shell: ReverseShell
  config: ReverseShellConfig
}) {
  const command = generate(shell, config)

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{shell.name}</h3>
          <span className="ml-auto flex items-center gap-1">
            <Badge variant="secondary" size="sm">
              {PLATFORM_LABEL[shell.platform] ?? shell.platform}
            </Badge>
            <Badge variant="outline" size="sm">
              {shell.category}
            </Badge>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{shell.description}</p>
      </header>
      <ToolCodeBlock code={command} language={shell.language} />
    </article>
  )
}
