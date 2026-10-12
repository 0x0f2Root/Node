"use client"

import * as React from "react"

import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { ToolCodeBlock } from "@/components/tools/code-block"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FieldState } from "@/lib/tools/reverse-shell/filters"
import type { ReverseShellConfig } from "@/lib/tools/reverse-shell/types"
import { cn } from "@/lib/utils"
import { RadioTowerIcon, ZapIcon } from "lucide-react"

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

/** Commands to start a listener on the attacking host, for the current port. */
function listenerCommands(host: string, port: string) {
  return [
    { label: "Netcat", command: `nc -lvnp ${port}` },
    { label: "Netcat + rlwrap", command: `rlwrap nc -lvnp ${port}` },
    {
      label: "Socat (PTY)",
      command: `socat file:\`tty\`,raw,echo=0 tcp-listen:${port}`,
    },
    { label: "pwncat", command: `pwncat-cs -lp ${port}` },
    {
      label: "Metasploit",
      wide: true,
      command: `msfconsole -q -x "use multi/handler; set payload generic/shell_reverse_tcp; set LHOST ${host}; set LPORT ${port}; run"`,
    },
  ]
}

/**
 * The listener configuration: LHOST and LPORT. Editing either updates the
 * `config` immediately — there is no submit — so every shell on the page
 * regenerates live. Invalid values still flow through (the user may be
 * mid-typing) but surface an inline error. The listener commands below
 * regenerate with the port the same way.
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
  const port = config.port.trim() || "PORT"
  const host = config.host.trim() || "LHOST"
  const listeners = listenerCommands(host, port)

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
      </FramePanel>

      <FramePanel className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xs tracking-wide">Listener</span>
          <span className="text-xs text-muted-foreground">
            Run one on your host (LHOST) before triggering a shell
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {listeners.map((listener) => (
            <ToolCodeBlock
              key={listener.label}
              code={listener.command}
              language="bash"
              label={listener.label}
              className={cn(listener.wide && "sm:col-span-2")}
            />
          ))}
        </div>
      </FramePanel>
    </Frame>
  )
}
