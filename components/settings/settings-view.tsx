"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { THEMES } from "@/components/app-shell/theme-menu"
import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { BackgroundSettings } from "@/components/theme/background-settings"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePagesState } from "@/lib/pages/store"
import {
  updateEditorSettings,
  useEditorSettings,
  type EditorFontSize,
  type EditorWidth,
} from "@/lib/settings/store"
import { useHydrated, useModKey } from "@/lib/utils/client"
import { UploadIcon } from "lucide-react"

const WIDTHS: { value: EditorWidth; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "full", label: "Full width" },
]

const FONT_SIZES: { value: EditorFontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
]

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <h2
        id={`${id}-heading`}
        className="border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h2>
      <div className="divide-y">{children}</div>
    </section>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// A segmented control: one choice out of a few, all visible.
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList aria-label={label}>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value} className="px-3">
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="text-sm">{label}</span>
      <KbdGroup>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </div>
  )
}

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const settings = useEditorSettings()
  const { status, pages } = usePagesState()
  const { importMarkdown } = useWorkspaceUI()
  const modKey = useModKey()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 pt-10 pb-24 sm:px-8 md:pt-16">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Section id="appearance" title="Appearance">
        <Row
          label="Theme"
          description="System follows your device's light or dark setting."
        >
          <Segmented
            label="Theme"
            value={hydrated ? (theme ?? "system") : "system"}
            options={THEMES}
            onChange={setTheme}
          />
        </Row>
        <BackgroundSettings />
      </Section>

      <Section id="editor" title="Editor">
        <Row
          label="Page width"
          description="Comfortable keeps lines short enough to read easily."
        >
          <Segmented
            label="Page width"
            value={settings.editorWidth}
            options={WIDTHS}
            onChange={(editorWidth) => updateEditorSettings({ editorWidth })}
          />
        </Row>
        <Row label="Font size" description="Applies to the document body.">
          <Segmented
            label="Font size"
            value={settings.fontSize}
            options={FONT_SIZES}
            onChange={(fontSize) => updateEditorSettings({ fontSize })}
          />
        </Row>
      </Section>

      <Section id="workspace" title="Workspace">
        <Row
          label="Storage"
          description={
            status === "ready"
              ? `${pages.length} ${
                  pages.length === 1 ? "page" : "pages"
                }, stored as Markdown in this browser. Clearing site data removes them.`
              : "Pages are stored as Markdown in this browser."
          }
        >
          <Button variant="outline" size="sm" onClick={importMarkdown}>
            <UploadIcon data-icon="inline-start" />
            Import Markdown
          </Button>
        </Row>
      </Section>

      <Section id="shortcuts" title="Keyboard shortcuts">
        <Shortcut label="Command palette" keys={[modKey, "K"]} />
        <Shortcut
          label="Command palette (alternative)"
          keys={[modKey, "Shift", "P"]}
        />
        <Shortcut label="Toggle sidebar" keys={[modKey, "\\"]} />
        <Shortcut label="Insert a block in the editor" keys={["/"]} />
        <Shortcut label="Toggle light and dark" keys={["D"]} />
      </Section>

      <Section id="about" title="About">
        <Row
          label="Node"
          description="A Markdown-first workspace. Documents are edited with the Fumadocs editor and kept as plain Markdown/MDX source."
        >
          <span className="text-sm text-muted-foreground tabular-nums">
            v0.0.1
          </span>
        </Row>
      </Section>
    </div>
  )
}
