"use client"

import * as React from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
} from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEditorSettings } from "@/lib/settings/store"
import {
  detectEncodings,
  ENCODING_GROUPS,
  ENCODINGS,
  EncodingError,
  getEncoding,
  transform,
  type EncodingMode,
  type EncodingOperation,
  type TransformResult,
} from "@/lib/tools/encoding/transformations"
import { cn } from "@/lib/utils"
import { useModKey } from "@/lib/utils/client"
import {
  ArrowLeftRightIcon,
  CircleAlertIcon,
  ClipboardPasteIcon,
  CopyIcon,
  InfoIcon,
  LockIcon,
  SparklesIcon,
  WrapTextIcon,
  XIcon,
} from "lucide-react"

interface Outcome {
  result?: TransformResult
  error?: { message: string; hint?: string }
}

// Everything below runs in this tab. Nothing typed here is sent anywhere,
// stored, or run: the transformations only ever turn text into text.
function run(
  operation: EncodingOperation,
  mode: EncodingMode,
  input: string,
  encodeAll: boolean
): Outcome {
  try {
    return { result: transform(operation, mode, input, { encodeAll }) }
  } catch (error) {
    return error instanceof EncodingError
      ? { error: { message: error.message, hint: error.hint } }
      : { error: { message: "This input could not be transformed." } }
  }
}

function plural(amount: number, word: string) {
  return `${amount.toLocaleString()} ${word}${amount === 1 ? "" : "s"}`
}

/** "11 characters", plus the byte count when the two differ. */
function measure(text: string) {
  const characters = Array.from(text).length
  const bytes = new TextEncoder().encode(text).length
  return bytes === characters
    ? plural(characters, "character")
    : `${plural(characters, "character")} · ${plural(bytes, "byte")}`
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error("Could not copy", {
      description:
        "The browser blocked clipboard access. Select the text and copy it instead.",
    })
  }
}

// The panel is the field's frame, so the textarea itself is bare.
const FIELD =
  "min-h-72 flex-1 resize-y rounded-none border-0 bg-transparent px-(--frame-panel-px) py-0 font-mono text-[0.8125rem] leading-relaxed shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-[0.8125rem] dark:bg-transparent"

const PANEL =
  "flex min-w-0 flex-col gap-2 px-0 pb-0 transition-colors focus-within:border-ring"

function PanelBar({
  htmlFor,
  label,
  detail,
  children,
}: {
  htmlFor?: string
  label: string
  detail?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex h-6 items-center gap-2 px-(--frame-panel-px)">
      <Label
        htmlFor={htmlFor}
        className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </Label>
      <span className="ml-auto truncate text-xs text-muted-foreground tabular-nums">
        {detail}
      </span>
      {children}
    </div>
  )
}

function PanelActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 border-t px-2 py-1.5">
      {children}
    </div>
  )
}

/** A decoded JWT: header, payload and signature, each on its own. */
function Sections({ result }: { result: TransformResult }) {
  return (
    <div
      className="flex min-h-72 flex-1 flex-col gap-4 overflow-auto px-(--frame-panel-px)"
      tabIndex={0}
      role="group"
      aria-label="Decoded token"
    >
      {result.sections?.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              {section.title}
            </h3>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Copy ${section.title.toLowerCase()}`}
              onClick={() => void copy(section.content, section.title)}
            >
              <CopyIcon />
            </Button>
          </div>
          <pre className="overflow-x-auto font-mono text-[0.8125rem] leading-relaxed whitespace-pre">
            {section.content}
          </pre>
        </section>
      ))}
    </div>
  )
}

/**
 * Node's encoder and decoder. Pick a format and a direction, paste, and
 * transform; the result is ready to copy or to swap back into the input.
 */
export function DataEncoding() {
  const modKey = useModKey()
  const { editorWidth } = useEditorSettings()
  const inputId = React.useId()
  const outputId = React.useId()

  const [operation, setOperation] = React.useState<EncodingOperation>("base64")
  const [mode, setMode] = React.useState<EncodingMode>("encode")
  const [encodeAll, setEncodeAll] = React.useState(false)
  const [live, setLive] = React.useState(false)
  const [wrap, setWrap] = React.useState(false)
  const [input, setInput] = React.useState("")
  // The last explicit run, with the settings and input it was made from.
  const [manual, setManual] = React.useState<{
    key: string
    outcome: Outcome
  } | null>(null)

  const encoding = getEncoding(operation)
  // A format that only decodes (JWT) overrides the chosen direction without
  // forgetting it, so switching back to Base64 restores it.
  const activeMode = encoding.modes.includes(mode) ? mode : encoding.modes[0]
  const option = activeMode === "encode" ? encoding.encodeAll : undefined
  const all = option !== undefined && encodeAll
  const key = JSON.stringify([operation, activeMode, all, input])

  // Cheap enough to do on every render; the compiler memoizes it anyway.
  const liveOutcome =
    live && input ? run(operation, activeMode, input, all) : null
  const outcome = live ? liveOutcome : (manual?.outcome ?? null)
  const stale = !live && manual !== null && manual.key !== key
  const result = outcome?.result
  const error = stale ? undefined : outcome?.error
  const output = result?.output ?? ""
  const verb = activeMode === "encode" ? "Encode" : "Decode"
  const reversible = encoding.modes.length === 2
  const sample = encoding.samples[activeMode]

  // What the input looks like it is encoded as, other than what is already
  // selected. Only ever offered; choosing one is the user's click.
  const guesses = detectEncodings(input).filter(
    (guess) => !(guess.operation === operation && activeMode === "decode")
  )

  function runNow() {
    if (!input) {
      setManual(null)
      return
    }
    setManual({ key, outcome: run(operation, activeMode, input, all) })
  }

  function decodeAs(next: EncodingOperation) {
    setOperation(next)
    setMode("decode")
    setManual({
      key: JSON.stringify([next, "decode", false, input]),
      outcome: run(next, "decode", input, false),
    })
  }

  // Output becomes input and the direction flips, so the old input is what
  // transforming again gives back. Nothing is lost.
  function swap() {
    if (!output) {
      return
    }
    const nextMode: EncodingMode = activeMode === "encode" ? "decode" : "encode"
    const nextAll = nextMode === "encode" && encoding.encodeAll && encodeAll
    setMode(nextMode)
    setInput(output)
    setManual({
      key: JSON.stringify([operation, nextMode, Boolean(nextAll), output]),
      outcome: { result: { output: input } },
    })
  }

  async function paste() {
    try {
      setInput(await navigator.clipboard.readText())
    } catch {
      toast.error("Could not read the clipboard", {
        description: `The browser blocked access. Click the input and press ${modKey} V instead.`,
      })
    }
  }

  function clear() {
    setInput("")
    setManual(null)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      runNow()
    } else if (event.shiftKey && event.key.toLowerCase() === "c" && output) {
      event.preventDefault()
      void copy(output, "Output")
    }
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-5 pt-10 pb-24 sm:px-8 md:pt-14",
        editorWidth === "full" ? "max-w-none lg:px-16" : "max-w-5xl"
      )}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Data Encoding
          </h1>
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant="outline"
                  size="sm"
                  className="font-mono tracking-wider text-muted-foreground uppercase"
                />
              }
            >
              <LockIcon aria-hidden="true" />
              Local processing
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Runs in this browser tab. Nothing is sent or saved.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Encode and decode common data formats used during security testing,
          development, and technical analysis.
        </p>
      </header>

      <Frame spacing="sm">
        <FrameHeader className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
          <Select
            value={operation}
            onValueChange={(next) => {
              if (next) {
                setOperation(next as EncodingOperation)
              }
            }}
          >
            <SelectTrigger aria-label="Encoding" className="w-52 bg-background">
              <SelectValue>{encoding.name}</SelectValue>
            </SelectTrigger>
            {/* Opens below the trigger, at its own width: the list is wider
                than the trigger because each format carries a description. */}
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="w-72"
            >
              {ENCODING_GROUPS.map((group) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {ENCODINGS.filter((item) => item.group === group).map(
                    (item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        className="py-1.5"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            value={activeMode}
            onValueChange={(next) => setMode(next as EncodingMode)}
          >
            <TabsList aria-label="Direction">
              <TabsTrigger
                value="encode"
                className="px-3"
                disabled={!encoding.modes.includes("encode")}
              >
                Encode
              </TabsTrigger>
              <TabsTrigger value="decode" className="px-3">
                Decode
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {operation === "jwt" ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
              Decode only — signature verification is not performed.
            </p>
          ) : null}

          {option ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <label className="flex items-center gap-2 text-sm text-muted-foreground" />
                }
              >
                <Switch
                  size="sm"
                  checked={encodeAll}
                  onCheckedChange={setEncodeAll}
                />
                {option.label}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {option.description}
              </TooltipContent>
            </Tooltip>
          ) : null}

          <Tooltip>
            <TooltipTrigger
              render={
                <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground" />
              }
            >
              <Switch size="sm" checked={live} onCheckedChange={setLive} />
              Live
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Transform as you type, instead of on {verb}.
            </TooltipContent>
          </Tooltip>
        </FrameHeader>

        <div className="relative grid gap-(--frame-gap) lg:grid-cols-2">
          <FramePanel className={PANEL}>
            <PanelBar
              htmlFor={inputId}
              label="Input"
              detail={input ? measure(input) : null}
            />
            <Textarea
              id={inputId}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste text or encoded data here..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              className={FIELD}
            />
            <PanelActions>
              <Button variant="ghost" size="sm" onClick={() => void paste()}>
                <ClipboardPasteIcon data-icon="inline-start" />
                Paste
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!input}
                onClick={clear}
              >
                <XIcon data-icon="inline-start" />
                Clear
              </Button>
              {!input && sample ? (
                <span className="ml-auto flex min-w-0 items-center gap-1.5 pr-1 text-xs text-muted-foreground">
                  Sample
                  <button
                    type="button"
                    onClick={() => setInput(sample)}
                    className="max-w-44 truncate rounded-sm border border-dashed px-1.5 py-0.5 font-mono outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    title="Use this sample input"
                  >
                    {sample}
                  </button>
                </span>
              ) : null}
              {guesses.length > 0 ? (
                <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 pr-1 text-xs text-muted-foreground">
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                  Looks like
                  {guesses.map((guess) => (
                    <Badge
                      key={guess.operation}
                      variant="outline"
                      size="sm"
                      render={
                        <button
                          type="button"
                          title={`Decode as ${guess.name}`}
                          onClick={() => decodeAs(guess.operation)}
                        />
                      }
                      className="cursor-pointer hover:bg-muted"
                    >
                      {guess.name}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </PanelActions>
          </FramePanel>

          {reversible ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Swap input and output"
                    disabled={!output || stale}
                    onClick={swap}
                    // Sits on the seam between the two panels.
                    className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background shadow-xs disabled:opacity-100 disabled:[&_svg]:opacity-40"
                  />
                }
              >
                <ArrowLeftRightIcon className="max-lg:rotate-90" />
              </TooltipTrigger>
              <TooltipContent>Swap input and output</TooltipContent>
            </Tooltip>
          ) : null}

          <FramePanel
            className={cn(
              PANEL,
              "[--frame-panel-bg:color-mix(in_oklch,var(--color-card)_60%,transparent)]"
            )}
          >
            <PanelBar
              htmlFor={result?.sections || error ? undefined : outputId}
              label="Output"
              detail={
                stale ? (
                  <span className="text-foreground">
                    Input changed · press {verb}
                  </span>
                ) : output ? (
                  measure(output)
                ) : null
              }
            >
              {!result?.sections ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Wrap long lines"
                        aria-pressed={wrap}
                        onClick={() => setWrap((value) => !value)}
                        className={cn(wrap && "bg-muted text-foreground")}
                      />
                    }
                  >
                    <WrapTextIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    {wrap ? "Scroll long lines" : "Wrap long lines"}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </PanelBar>

            <div
              aria-live="polite"
              className={cn(
                "flex min-h-72 flex-1 flex-col gap-3",
                stale && "opacity-60"
              )}
            >
              {error ? (
                <div className="px-(--frame-panel-px)">
                  <Alert variant="destructive">
                    <CircleAlertIcon aria-hidden="true" />
                    <AlertTitle>{error.message}</AlertTitle>
                    {error.hint ? (
                      <AlertDescription>{error.hint}</AlertDescription>
                    ) : null}
                  </Alert>
                </div>
              ) : result?.sections ? (
                <Sections result={result} />
              ) : (
                <Textarea
                  id={outputId}
                  value={output}
                  readOnly
                  // Long encoded strings scroll sideways unless wrapping is on.
                  wrap={output && !wrap ? "off" : "soft"}
                  placeholder="Enter text to encode or encoded data to decode."
                  spellCheck={false}
                  className={cn(
                    FIELD,
                    output && !wrap && "overflow-x-auto whitespace-pre",
                    wrap && "break-all"
                  )}
                />
              )}
              {result?.note ? (
                <p className="flex gap-1.5 px-(--frame-panel-px) font-mono text-xs whitespace-pre-line text-muted-foreground">
                  <InfoIcon
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {result.note}
                </p>
              ) : null}
            </div>

            <PanelActions>
              <Button
                variant="ghost"
                size="sm"
                disabled={!output}
                onClick={() => void copy(output, "Output")}
              >
                <CopyIcon data-icon="inline-start" />
                Copy output
              </Button>
              {!live ? (
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={!input}
                  onClick={runNow}
                >
                  {verb}
                  <KbdGroup className="ml-1 opacity-70">
                    <Kbd>{modKey}</Kbd>
                    <Kbd>↵</Kbd>
                  </KbdGroup>
                </Button>
              ) : (
                <span className="ml-auto pr-1 text-xs text-muted-foreground">
                  Updating as you type
                </span>
              )}
            </PanelActions>
          </FramePanel>
        </div>

        <FrameFooter className="flex-row flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>{modKey}</Kbd>
              <Kbd>↵</Kbd>
            </KbdGroup>
            {verb.toLowerCase()}
          </span>
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>{modKey}</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>C</Kbd>
            </KbdGroup>
            copy output
          </span>
          <span className="ml-auto">{encoding.description}</span>
        </FrameFooter>
      </Frame>
    </div>
  )
}
