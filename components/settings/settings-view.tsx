"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { THEMES } from "@/components/app-shell/theme-menu"
import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import {
  runCopyLegacyPages,
  runReload,
} from "@/components/project/project-actions"
import { BackgroundSettings } from "@/components/theme/background-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { saveHtbProfile, useHtb } from "@/lib/htb/store"
import { countLegacyPages } from "@/lib/pages/legacy-import"
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

// Which HackTheBox player the tracker on Home follows, and whether the
// optional App Token is in place. The token is never typed into Node: the
// server reads it from .env.local.
function HtbSettings() {
  const { status, response } = useHtb()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const profile = String(
      new FormData(event.currentTarget).get("profile") ?? ""
    )
    try {
      await saveHtbProfile(profile)
      toast.success(
        profile.trim()
          ? "HackTheBox profile saved"
          : "HackTheBox tracker turned off"
      )
    } catch (error) {
      toast.error("Could not save the profile", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <>
      <Row
        label="Profile"
        description={
          response?.data
            ? `Tracking ${response.data.profile.name}. The profile has to be public.`
            : "Your public profile link or its number. Leave empty to turn the tracker off."
        }
      >
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            // Remount when the saved value arrives or changes.
            key={response?.profileId ?? "none"}
            name="profile"
            defaultValue={response?.profileId ?? ""}
            placeholder="app.hackthebox.com/public/users/…"
            aria-label="HackTheBox profile link or id"
            autoComplete="off"
            className="w-56"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={status === "loading"}
          >
            Save
          </Button>
        </form>
      </Row>
      <Row
        label="App Token"
        description={
          response?.tokenConfigured
            ? "A token is set on the server, so Home also lists your latest solves."
            : "Optional, for the list of individual solves. Create an App Token in your HackTheBox profile settings, put it in a file named .env.local in the Node project as HTB_APP_TOKEN=your-token, then restart Node. It stays on this computer and is not saved with your notes."
        }
      >
        <span className="text-sm text-muted-foreground">
          {response?.tokenConfigured ? "Detected" : "Not set"}
        </span>
      </Row>
    </>
  )
}

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const settings = useEditorSettings()
  const { status, pages } = usePagesState()
  const documents = pages.filter((page) => page.kind === "page").length
  // Pages from before Node stored files; they stay in the browser untouched.
  const legacy = hydrated ? countLegacyPages() : 0
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
              ? `${documents} ${
                  documents === 1 ? "page" : "pages"
                }, each a Markdown file in data/pages/ inside the Node project.`
              : "Pages are Markdown files in data/pages/ inside the Node project."
          }
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runReload()}
            >
              Reload from disk
            </Button>
            <Button variant="outline" size="sm" onClick={importMarkdown}>
              <UploadIcon data-icon="inline-start" />
              Import Markdown
            </Button>
          </div>
        </Row>
        {legacy > 0 ? (
          <Row
            label="Pages in this browser"
            description={`${legacy} ${
              legacy === 1 ? "page" : "pages"
            } from before Node used files. Migrating never replaces an existing file and keeps the browser copy.`}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runCopyLegacyPages()}
            >
              Migrate pages
            </Button>
          </Row>
        ) : null}
      </Section>

      <Section id="hackthebox" title="HackTheBox">
        <HtbSettings />
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
