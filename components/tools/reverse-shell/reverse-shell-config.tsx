"use client"

import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FieldState } from "@/lib/tools/reverse-shell/filters"
import type { ReverseShellConfig } from "@/lib/tools/reverse-shell/types"
import { cn } from "@/lib/utils"
import { CopyIcon, RadioTowerIcon, ZapIcon } from "lucide-react"

function Field({
  id,
  label,
  description,
  state,
  children,
}: {
  id: string
  label: string
  description: string
  state: FieldState
  children: React.ReactNode
}) {
  const message = state.error ?? state.hint
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="font-mono text-xs tracking-wide">
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      {children}
      <p
        className={cn(
          "min-h-4 text-xs",
          state.error ? "text-destructive" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {message ?? ""}
      </p>
    </div>
  )
}

/**
 * The listener configuration: LHOST and LPORT. Editing either updates the
 * `config` immediately — there is no submit — so every shell on the page
 * regenerates live. Invalid values still flow through (the user may be
 * mid-typing) but surface an inline error.
 */
export function ReverseShellConfigPanel({
  config,
  onChange,
  hostState,
  portState,
}: {
  config: ReverseShellConfig
  onChange: (config: ReverseShellConfig) => void
  hostState: FieldState
  portState: FieldState
}) {
  const listener = `${config.host.trim() || "LHOST"}:${
    config.port.trim() || "LPORT"
  }`

  function copyListener() {
    navigator.clipboard
      .writeText(listener)
      .then(() => toast.success("Listener copied"))
      .catch(() => toast.error("Could not copy the listener"))
  }

  return (
    <Frame spacing="sm">
      <FrameHeader className="flex-row items-center gap-2">
        <RadioTowerIcon
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <FrameTitle>Connection</FrameTitle>
        <Badge
          variant="outline"
          size="sm"
          className="ml-auto gap-1 text-muted-foreground"
        >
          <ZapIcon className="size-3" aria-hidden="true" />
          Auto update
        </Badge>
      </FrameHeader>

      <FramePanel className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Field
          id="rs-lhost"
          label="LHOST"
          description="Listener IP address"
          state={hostState}
        >
          <Input
            id="rs-lhost"
            value={config.host}
            onChange={(event) =>
              onChange({ ...config, host: event.target.value })
            }
            placeholder="10.10.14.5"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={hostState.error ? true : undefined}
            className="font-mono"
          />
        </Field>

        <Field
          id="rs-lport"
          label="LPORT"
          description="Listener port"
          state={portState}
        >
          <Input
            id="rs-lport"
            value={config.port}
            onChange={(event) =>
              onChange({ ...config, port: event.target.value })
            }
            placeholder="4444"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={portState.error ? true : undefined}
            className="font-mono"
          />
        </Field>

        <div className="flex flex-col gap-1.5 sm:w-56">
          <span className="text-xs tracking-wide text-muted-foreground">
            Listener
          </span>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 py-1 pr-1 pl-2.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">
              {listener}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copy listener address"
              onClick={copyListener}
            >
              <CopyIcon />
            </Button>
          </div>
          <p className="min-h-4 text-xs text-muted-foreground">
            Convenience only — no listener is started.
          </p>
        </div>
      </FramePanel>
    </Frame>
  )
}
