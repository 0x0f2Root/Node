"use client"

import { BackgroundLayer } from "@/components/theme/background-layer"
import { Spinner } from "@/components/ui/spinner"
import type { BackgroundConfig } from "@/lib/theme/background"
import { cn } from "@/lib/utils"

/**
 * A miniature of the workspace with the current background behind it. It
 * renders the same BackgroundLayer, with the same image, as the real thing.
 */
export function BackgroundPreview({
  config,
  url,
  busy,
}: {
  config: BackgroundConfig
  url: string | null
  busy: boolean
}) {
  return (
    <div
      role="img"
      aria-label="Preview of the workspace background"
      className="relative isolate flex aspect-[16/9] w-full overflow-hidden rounded-lg border bg-background"
    >
      <BackgroundLayer
        config={config}
        url={url}
        className="absolute inset-0 -z-10"
      />

      {/* Sidebar and topbar stay solid in the real workspace too. */}
      <div className="flex w-[22%] shrink-0 flex-col gap-1.5 border-r bg-sidebar p-2.5">
        <div className="h-1.5 w-2/3 rounded-full bg-sidebar-foreground/25" />
        <div className="mt-2 h-1.5 w-4/5 rounded-full bg-sidebar-foreground/15" />
        <div className="h-1.5 w-3/5 rounded-full bg-sidebar-foreground/15" />
        <div className="h-1.5 w-3/4 rounded-full bg-sidebar-foreground/15" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-[9%] shrink-0 border-b bg-background" />
        <div
          className={cn(
            "flex flex-1 flex-col",
            config.solidContent && config.mode !== "none" && "p-[3%]"
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-3/5 flex-1 flex-col gap-2 px-[4%] pt-[7%]",
              config.solidContent &&
                config.mode !== "none" &&
                "rounded-md border bg-background"
            )}
          >
            <div className="h-2.5 w-1/2 rounded-full bg-foreground/80" />
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-foreground/30" />
            <div className="h-1.5 w-11/12 rounded-full bg-foreground/30" />
            <div className="h-1.5 w-2/3 rounded-full bg-foreground/30" />
          </div>
        </div>
      </div>

      {busy ? (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Processing
        </div>
      ) : null}
    </div>
  )
}
