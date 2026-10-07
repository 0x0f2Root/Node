"use client"

import { useMemo, useSyncExternalStore } from "react"

import { createPersistentStore } from "@/lib/utils/store"

export type BackgroundMode = "none" | "solid" | "image" | "pixel"
export type PixelStyle = "8bit" | "16bit"
export type Dithering = "off" | "low" | "medium" | "high"
export type BackgroundFit = "cover" | "contain" | "fill"
export type BackgroundPosition = "center" | "top" | "bottom" | "left" | "right"

/** RGB triplets. Only colour lists: no artwork is bundled. */
export type Rgb = readonly [number, number, number]

export const PALETTES = [
  { id: "auto", label: "Automatic", colors: null },
  { id: "mono", label: "Monochrome", colors: null },
  {
    id: "gameboy",
    label: "Game Boy inspired",
    colors: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15],
    ],
  },
  {
    id: "cga",
    label: "CGA inspired",
    colors: [
      [0, 0, 0],
      [0, 0, 170],
      [0, 170, 0],
      [0, 170, 170],
      [170, 0, 0],
      [170, 0, 170],
      [170, 85, 0],
      [170, 170, 170],
      [85, 85, 85],
      [85, 85, 255],
      [85, 255, 85],
      [85, 255, 255],
      [255, 85, 85],
      [255, 85, 255],
      [255, 255, 85],
      [255, 255, 255],
    ],
  },
  {
    id: "pico8",
    label: "PICO-8 inspired",
    colors: [
      [0, 0, 0],
      [29, 43, 83],
      [126, 37, 83],
      [0, 135, 81],
      [171, 82, 54],
      [95, 87, 79],
      [194, 195, 199],
      [255, 241, 232],
      [255, 0, 77],
      [255, 163, 0],
      [255, 236, 39],
      [0, 228, 54],
      [41, 173, 255],
      [131, 118, 156],
      [255, 119, 168],
      [255, 204, 170],
    ],
  },
] as const satisfies readonly {
  id: string
  label: string
  colors: readonly Rgb[] | null
}[]

export type PaletteId = (typeof PALETTES)[number]["id"]

// Solid backgrounds are built from the theme's own tokens, so they follow
// light and dark mode with everything else.
export const SOLID_COLORS = [
  { id: "muted", label: "Muted", value: "var(--muted)" },
  { id: "sidebar", label: "Sidebar", value: "var(--sidebar)" },
  {
    id: "blue",
    label: "Blue",
    value: "color-mix(in oklab, var(--color-blue-500) 14%, var(--background))",
  },
  {
    id: "green",
    label: "Green",
    value:
      "color-mix(in oklab, var(--color-emerald-500) 14%, var(--background))",
  },
  {
    id: "orange",
    label: "Orange",
    value:
      "color-mix(in oklab, var(--color-orange-500) 14%, var(--background))",
  },
  {
    id: "purple",
    label: "Purple",
    value:
      "color-mix(in oklab, var(--color-violet-500) 14%, var(--background))",
  },
] as const

export type SolidColorId = (typeof SOLID_COLORS)[number]["id"]

export const PIXEL_SIZE_LABELS = [
  "Subtle",
  "Small",
  "Medium",
  "Large",
  "Extreme",
] as const

/** Palette sizes offered by the colour-depth control. */
export const COLOR_DEPTHS = [4, 8, 16, 32, 64, 128] as const

export type BackgroundConfig = {
  mode: BackgroundMode
  solid: SolidColorId

  /** Identifies the uploaded image in asset storage; never the image itself. */
  imageId: string | null
  imageName: string | null

  pixelStyle: PixelStyle
  /** 1 (subtle) to 5 (extreme) */
  pixelSize: number
  palette: PaletteId
  /** palette size for the Automatic and Monochrome palettes */
  colors: number
  dithering: Dithering
  /** -50 to 50 */
  contrast: number
  saturation: number
  brightness: number

  /** 0 to 100 */
  opacity: number
  overlay: boolean
  overlayOpacity: number
  /** 0 to 100: how early the image fades into the app background */
  fade: number
  /** px */
  blur: number
  vignette: number

  fit: BackgroundFit
  position: BackgroundPosition

  /** Put page content on solid sheets, leaving the image as a frame. */
  solidContent: boolean
}

/** What choosing "8-bit" or "16-bit" sets. */
export const PIXEL_PRESETS: Record<
  PixelStyle,
  Pick<BackgroundConfig, "pixelStyle" | "pixelSize" | "colors" | "dithering">
> = {
  "8bit": { pixelStyle: "8bit", pixelSize: 3, colors: 16, dithering: "low" },
  "16bit": { pixelStyle: "16bit", pixelSize: 3, colors: 64, dithering: "off" },
}

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  mode: "none",
  solid: "muted",
  imageId: null,
  imageName: null,
  ...PIXEL_PRESETS["8bit"],
  palette: "auto",
  contrast: 0,
  saturation: 0,
  brightness: 0,
  opacity: 100,
  overlay: true,
  overlayOpacity: 55,
  fade: 60,
  blur: 0,
  vignette: 20,
  fit: "cover",
  position: "center",
  solidContent: false,
}

const EMPTY: Partial<BackgroundConfig> = {}

// Same browser-local store as the rest of Node's settings. It holds only
// this small object; the image lives in asset storage.
const store = createPersistentStore<Partial<BackgroundConfig>>(
  "node.background.v1",
  EMPTY
)

export function useBackgroundConfig(): BackgroundConfig {
  const stored = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.getServer
  )
  return useMemo(() => ({ ...DEFAULT_BACKGROUND, ...stored }), [stored])
}

export function getBackgroundConfig(): BackgroundConfig {
  return { ...DEFAULT_BACKGROUND, ...store.get() }
}

export function updateBackground(patch: Partial<BackgroundConfig>) {
  store.set((config) => ({ ...config, ...patch }))
}

/** Back to Node's default appearance. Other preferences are untouched. */
export function resetBackgroundConfig() {
  store.set(EMPTY)
}
