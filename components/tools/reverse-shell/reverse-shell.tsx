"use client"

import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/reui/badge"
import { ReverseShellCard } from "@/components/tools/reverse-shell/reverse-shell-card"
import { ReverseShellConfigPanel } from "@/components/tools/reverse-shell/reverse-shell-config"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { generateAll } from "@/lib/tools/reverse-shell/catalog"
import {
  FILTERS,
  filterCounts,
  filterShells,
  validateHost,
  validatePort,
} from "@/lib/tools/reverse-shell/filters"
import type { ReverseShellConfig } from "@/lib/tools/reverse-shell/types"
import { useEditorSettings } from "@/lib/settings/store"
import { cn } from "@/lib/utils"
import { CopyIcon, SearchIcon, TerminalIcon } from "lucide-react"

const COUNTS = filterCounts()

/**
 * Reverse Shell Generator. The listener config drives every card live — no
 * Generate button. Strictly a text generator: it never runs, connects, or
 * starts a listener (see the page guard note and the pure catalog).
 */
export function ReverseShell() {
  const { editorWidth } = useEditorSettings()
  const [config, setConfig] = React.useState<ReverseShellConfig>({
    host: "",
    port: "4444",
  })
  const [filter, setFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")

  const hostState = validateHost(config.host)
  const portState = validatePort(config.port)
  const shells = filterShells(filter, query)

  function copyAll() {
    if (shells.length === 0) {
      return
    }
    navigator.clipboard
      .writeText(generateAll(shells, config))
      .then(() =>
        toast.success(
          `Copied ${shells.length} ${shells.length === 1 ? "shell" : "shells"}`
        )
      )
      .catch(() => toast.error("Could not copy the shells"))
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-5 pt-10 pb-24 sm:px-8 md:pt-14",
        editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-5xl"
      )}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reverse Shell Generator
          </h1>
          <Badge
            variant="outline"
            size="sm"
            className="font-mono tracking-wider text-muted-foreground uppercase"
          >
            <TerminalIcon aria-hidden="true" />
            Generator only
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Generate common reverse shell payloads for authorized security
          testing, CTFs, labs, and technical environments. Commands are text
          only — nothing is executed, connected, or listened for.
        </p>
      </header>

      <ReverseShellConfigPanel
        config={config}
        onChange={setConfig}
        hostState={hostState}
        portState={portState}
      />

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Shells
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {shells.length} of {COUNTS.all}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shells..."
                aria-label="Search shells"
                autoComplete="off"
                spellCheck={false}
                className="h-8 w-44 pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={shells.length === 0}
              onClick={copyAll}
            >
              <CopyIcon data-icon="inline-start" />
              Copy all
            </Button>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              // multiple is off, so keep a selection even when the active
              // chip is pressed again.
              if (value[0]) {
                setFilter(value[0])
              }
            }}
            variant="outline"
            size="sm"
            className="w-max"
          >
            {FILTERS.map((item) => (
              <ToggleGroupItem
                key={item.id}
                value={item.id}
                disabled={COUNTS[item.id] === 0}
                className="gap-1.5"
              >
                {item.label}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {COUNTS[item.id]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {shells.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TerminalIcon />
            </EmptyMedia>
            <EmptyTitle>No shells found</EmptyTitle>
            <EmptyDescription>
              Try another language, platform, or search term.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shells.map((shell) => (
            <ReverseShellCard key={shell.id} shell={shell} config={config} />
          ))}
        </div>
      )}
    </div>
  )
}
