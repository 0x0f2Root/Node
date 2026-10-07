"use client"

import * as React from "react"
import { toast } from "sonner"

import { BackgroundPreview } from "@/components/theme/background-preview"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  COLOR_DEPTHS,
  PALETTES,
  PIXEL_PRESETS,
  PIXEL_SIZE_LABELS,
  SOLID_COLORS,
  updateBackground,
  useBackgroundConfig,
  type BackgroundConfig,
  type BackgroundFit,
  type BackgroundMode,
  type BackgroundPosition,
  type Dithering,
  type PaletteId,
  type PixelStyle,
} from "@/lib/theme/background"
import {
  ACCEPTED_IMAGE_TYPES,
  removeBackgroundImage,
  resetBackground,
  uploadBackgroundImage,
  useBackgroundImage,
} from "@/lib/theme/background-image"
import { cn } from "@/lib/utils"
import { useHydrated } from "@/lib/utils/client"
import {
  CheckIcon,
  ChevronRightIcon,
  ImageIcon,
  ImageUpIcon,
} from "lucide-react"

const MODES: { value: BackgroundMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "image", label: "Image" },
  { value: "pixel", label: "Pixel Art" },
]

const STYLES: { value: PixelStyle; label: string }[] = [
  { value: "8bit", label: "8-bit" },
  { value: "16bit", label: "16-bit" },
]

const DITHERING: { value: Dithering; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

const FITS: { value: BackgroundFit; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
]

const POSITIONS: { value: BackgroundPosition; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
]

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

/** A labelled control on one line: label left, control right. */
function Setting({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      {children}
    </div>
  )
}

function SliderSetting({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  /** the value as shown beside the label */
  display: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {display}
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? (next[0] ?? value) : next)
        }
      />
    </div>
  )
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function ImageField({ config }: { config: BackgroundConfig }) {
  const input = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  async function upload(file: File | undefined) {
    if (!file) {
      return
    }
    setUploading(true)
    try {
      await uploadBackgroundImage(file)
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploading(false)
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      className="sr-only"
      aria-label="Background image file"
      onChange={(event) => {
        void upload(event.target.files?.[0])
        event.target.value = ""
      }}
    />
  )

  if (config.imageId) {
    return (
      <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
        <ImageIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm">
          {config.imageName ?? "Background image"}
        </span>
        {picker}
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          Replace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void removeBackgroundImage()}
        >
          Remove image
        </Button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void upload(event.dataTransfer.files[0])
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        dragging && "border-ring bg-muted/50"
      )}
    >
      {picker}
      <ImageUpIcon
        className="mb-1 size-5 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="text-sm font-medium">
        {uploading ? "Preparing image…" : "Upload background"}
      </span>
      <span className="text-sm text-muted-foreground">
        Drag an image here or <span className="underline">browse</span>
      </span>
      <span className="text-xs text-muted-foreground">
        PNG, JPG, WebP or GIF, up to 20 MB. Stays in this browser.
      </span>
    </label>
  )
}

function SolidPicker({ config }: { config: BackgroundConfig }) {
  return (
    <Setting label="Color">
      <div
        role="radiogroup"
        aria-label="Background color"
        className="flex gap-1.5"
      >
        {SOLID_COLORS.map((color) => {
          const selected = config.solid === color.id
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              title={color.label}
              onClick={() => updateBackground({ solid: color.id })}
              className="flex size-7 items-center justify-center rounded-md border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-foreground/60"
              style={{ backgroundColor: color.value }}
            >
              {selected ? (
                <CheckIcon className="size-3.5" aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </div>
    </Setting>
  )
}

function PixelControls({ config }: { config: BackgroundConfig }) {
  const paletteLabel =
    PALETTES.find((palette) => palette.id === config.palette)?.label ??
    PALETTES[0].label

  return (
    <>
      <Setting label="Pixel style">
        <Segmented
          label="Pixel style"
          value={config.pixelStyle}
          options={STYLES}
          onChange={(style) => updateBackground(PIXEL_PRESETS[style])}
        />
      </Setting>

      <SliderSetting
        label="Pixel size"
        value={config.pixelSize}
        display={PIXEL_SIZE_LABELS[config.pixelSize - 1] ?? ""}
        min={1}
        max={PIXEL_SIZE_LABELS.length}
        onChange={(pixelSize) => updateBackground({ pixelSize })}
      />

      <Setting label="Palette" htmlFor="background-palette">
        <Select
          value={config.palette}
          onValueChange={(next) => {
            if (next !== null) {
              updateBackground({ palette: next as PaletteId })
            }
          }}
        >
          <SelectTrigger id="background-palette" className="w-48">
            {/* Base UI's Value renders the raw value by default. */}
            <SelectValue>{paletteLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PALETTES.map((palette) => (
              <SelectItem key={palette.id} value={palette.id}>
                {palette.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>

      <Setting label="Dithering">
        <Segmented
          label="Dithering"
          value={config.dithering}
          options={DITHERING}
          onChange={(dithering) => updateBackground({ dithering })}
        />
      </Setting>
    </>
  )
}

function AdvancedControls({ config }: { config: BackgroundConfig }) {
  const pixel = config.mode === "pixel"
  // Fixed palettes bring their own colour count.
  const hasDepth =
    pixel && (config.palette === "auto" || config.palette === "mono")
  const depthIndex = Math.max(
    0,
    COLOR_DEPTHS.findIndex((depth) => depth === config.colors)
  )
  const positionLabel =
    POSITIONS.find((position) => position.value === config.position)?.label ??
    "Center"

  return (
    <div className="flex flex-col gap-5 pt-4">
      {hasDepth ? (
        <SliderSetting
          label="Color depth"
          value={depthIndex}
          display={`${COLOR_DEPTHS[depthIndex]} colors`}
          min={0}
          max={COLOR_DEPTHS.length - 1}
          onChange={(index) =>
            updateBackground({ colors: COLOR_DEPTHS[index] ?? 16 })
          }
        />
      ) : null}
      {pixel ? (
        <>
          <SliderSetting
            label="Contrast"
            value={config.contrast}
            display={signed(config.contrast)}
            min={-50}
            max={50}
            step={5}
            onChange={(contrast) => updateBackground({ contrast })}
          />
          <SliderSetting
            label="Saturation"
            value={config.saturation}
            display={signed(config.saturation)}
            min={-50}
            max={50}
            step={5}
            onChange={(saturation) => updateBackground({ saturation })}
          />
          <SliderSetting
            label="Brightness"
            value={config.brightness}
            display={signed(config.brightness)}
            min={-50}
            max={50}
            step={5}
            onChange={(brightness) => updateBackground({ brightness })}
          />
        </>
      ) : null}

      <SliderSetting
        label="Background opacity"
        value={config.opacity}
        display={`${config.opacity}%`}
        min={10}
        max={100}
        step={5}
        onChange={(opacity) => updateBackground({ opacity })}
      />
      <Setting label="Overlay" htmlFor="background-overlay">
        <Switch
          id="background-overlay"
          checked={config.overlay}
          onCheckedChange={(overlay) => updateBackground({ overlay })}
        />
      </Setting>
      {config.overlay ? (
        <SliderSetting
          label="Overlay opacity"
          value={config.overlayOpacity}
          display={`${config.overlayOpacity}%`}
          min={0}
          max={95}
          step={5}
          onChange={(overlayOpacity) => updateBackground({ overlayOpacity })}
        />
      ) : null}
      <SliderSetting
        label="Fade to background"
        value={config.fade}
        display={config.fade === 0 ? "Off" : `${config.fade}%`}
        min={0}
        max={100}
        step={5}
        onChange={(fade) => updateBackground({ fade })}
      />
      <SliderSetting
        label="Blur"
        value={config.blur}
        display={`${config.blur}px`}
        min={0}
        max={12}
        onChange={(blur) => updateBackground({ blur })}
      />
      <SliderSetting
        label="Vignette"
        value={config.vignette}
        display={config.vignette === 0 ? "Off" : `${config.vignette}%`}
        min={0}
        max={100}
        step={5}
        onChange={(vignette) => updateBackground({ vignette })}
      />

      <Setting label="Fit">
        <Segmented
          label="Fit"
          value={config.fit}
          options={FITS}
          onChange={(fit) => updateBackground({ fit })}
        />
      </Setting>
      <Setting label="Position" htmlFor="background-position">
        <Select
          value={config.position}
          onValueChange={(next) => {
            if (next !== null) {
              updateBackground({ position: next as BackgroundPosition })
            }
          }}
        >
          <SelectTrigger id="background-position" className="w-36">
            <SelectValue>{positionLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((position) => (
              <SelectItem key={position.value} value={position.value}>
                {position.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>
    </div>
  )
}

/** Settings → Appearance → Background. */
export function BackgroundSettings() {
  const stored = useBackgroundConfig()
  const hydrated = useHydrated()
  const image = useBackgroundImage()
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  // Render the stored choice only after hydration, like the theme control.
  const config: BackgroundConfig = hydrated
    ? stored
    : { ...stored, mode: "none" }
  const usesImage = config.mode === "image" || config.mode === "pixel"

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium">Background</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Customize the atmosphere of your Node workspace.
          </p>
        </div>
        <div className="shrink-0">
          <Segmented
            label="Background"
            value={config.mode}
            options={MODES}
            onChange={(mode) => updateBackground({ mode })}
          />
        </div>
      </div>

      {config.mode !== "none" ? (
        <>
          <BackgroundPreview
            config={config}
            url={image.url}
            busy={image.busy}
          />

          {image.error && usesImage ? (
            <p role="alert" className="text-sm text-destructive">
              {image.error}
            </p>
          ) : null}

          {config.mode === "solid" ? <SolidPicker config={config} /> : null}
          {usesImage ? <ImageField config={config} /> : null}
          {config.mode === "pixel" ? <PixelControls config={config} /> : null}

          <Setting label="Solid content" htmlFor="background-solid-content">
            <Switch
              id="background-solid-content"
              checked={config.solidContent}
              onCheckedChange={(solidContent) =>
                updateBackground({ solidContent })
              }
            />
          </Setting>

          {usesImage ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 rounded-sm text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <ChevronRightIcon
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-150",
                    advancedOpen && "rotate-90"
                  )}
                  aria-hidden="true"
                />
                Advanced
              </CollapsibleTrigger>
              <CollapsibleContent>
                <AdvancedControls config={config} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void resetBackground()}
            >
              Reset background
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
