"use client"

import { useSyncExternalStore } from "react"

import {
  getBackgroundConfig,
  resetBackgroundConfig,
  updateBackground,
  type BackgroundConfig,
} from "@/lib/theme/background"
import { deleteAsset, getAsset, putAsset } from "@/lib/theme/background-assets"
import { normalizeImage, pixelate } from "@/lib/theme/pixel-processing"
import { createStore } from "@/lib/utils/store"

interface OriginalAsset {
  id: string
  name: string
  blob: Blob
}

interface ProcessedAsset {
  key: string
  blob: Blob
}

export interface BackgroundImageState {
  /** object URL of the image to paint, or null when there is none */
  url: string | null
  /** true while an image is being loaded or processed */
  busy: boolean
  error: string | null
}

const IDLE: BackgroundImageState = { url: null, busy: false, error: null }

const ORIGINAL = "original"
const PROCESSED = "processed"

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const MAX_CACHED_URLS = 12
const PROCESS_DELAY_MS = 120

const state = createStore<BackgroundImageState>(IDLE)

// Finished images by cache key, as object URLs. Asking for a combination that
// was already produced this session costs nothing.
const urls = new Map<string, string>()
let wanted: string | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export function useBackgroundImage(): BackgroundImageState {
  return useSyncExternalStore(state.subscribe, state.get, () => IDLE)
}

/**
 * Identifies the image a configuration paints: the upload plus every setting
 * that changes its pixels. Opacity, overlay, blur and the rest are CSS on top
 * and are deliberately not part of it.
 */
export function imageKey(config: BackgroundConfig): string | null {
  if (!config.imageId) {
    return null
  }
  if (config.mode === "image") {
    return `image|${config.imageId}`
  }
  if (config.mode !== "pixel") {
    return null
  }
  return [
    "pixel",
    config.imageId,
    config.pixelStyle,
    config.pixelSize,
    config.palette,
    config.colors,
    config.dithering,
    config.contrast,
    config.saturation,
    config.brightness,
  ].join("|")
}

function remember(key: string, url: string) {
  urls.set(key, url)
  if (urls.size > MAX_CACHED_URLS) {
    const oldest = urls.keys().next().value
    if (oldest !== undefined && oldest !== wanted) {
      URL.revokeObjectURL(urls.get(oldest) ?? "")
      urls.delete(oldest)
    }
  }
}

async function produce(
  key: string,
  config: BackgroundConfig
): Promise<Blob | undefined> {
  if (config.mode === "image") {
    return (await getAsset<OriginalAsset>(ORIGINAL))?.blob
  }

  // The last processed result is kept on disk, so a reload paints it without
  // running the pipeline again.
  const saved = await getAsset<ProcessedAsset>(PROCESSED)
  if (saved?.key === key) {
    return saved.blob
  }

  const original = await getAsset<OriginalAsset>(ORIGINAL)
  if (!original) {
    return undefined
  }
  const bitmap = await createImageBitmap(original.blob)
  try {
    const blob = await pixelate(bitmap, {
      style: config.pixelStyle,
      size: config.pixelSize,
      palette: config.palette,
      colors: config.colors,
      dithering: config.dithering,
      contrast: config.contrast,
      saturation: config.saturation,
      brightness: config.brightness,
    })
    void putAsset(PROCESSED, { key, blob } satisfies ProcessedAsset)
    return blob
  } finally {
    bitmap.close()
  }
}

async function resolve(key: string, config: BackgroundConfig) {
  try {
    const blob = await produce(key, config)
    if (blob) {
      remember(key, URL.createObjectURL(blob))
    }
    // A newer request may have replaced this one while it was running.
    if (wanted !== key) {
      return
    }
    state.set(
      blob
        ? { url: urls.get(key) ?? null, busy: false, error: null }
        : {
            url: null,
            busy: false,
            error: "The background image is missing. Upload it again.",
          }
    )
  } catch (error) {
    if (wanted === key) {
      state.set({
        url: null,
        busy: false,
        error:
          error instanceof Error
            ? error.message
            : "The background could not be prepared.",
      })
    }
  }
}

/**
 * Makes sure the image for this configuration is ready. Safe to call on every
 * config change: it does nothing unless the image itself would differ, and
 * rapid changes (a slider being dragged) collapse into one run.
 */
export function ensureBackgroundImage(config: BackgroundConfig) {
  const key = imageKey(config)
  if (key === wanted) {
    return
  }
  wanted = key
  clearTimeout(timer)

  if (key === null) {
    state.set(IDLE)
    return
  }
  const cached = urls.get(key)
  if (cached) {
    state.set({ url: cached, busy: false, error: null })
    return
  }
  // Keep painting the previous image until the new one is ready.
  state.set((current) => ({ ...current, busy: true, error: null }))
  timer = setTimeout(
    () => void resolve(key, config),
    config.mode === "pixel" ? PROCESS_DELAY_MS : 0
  )
}

/** Validates, normalizes and stores an upload, then points the config at it. */
export async function uploadBackgroundImage(file: File): Promise<void> {
  // An allowlist of raster formats. SVG is refused: it can carry scripts.
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use a PNG, JPG, WebP or GIF image.")
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is larger than 20 MB.")
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("That file could not be read as an image.")
  }

  try {
    const blob = await normalizeImage(bitmap)
    const asset: OriginalAsset = {
      id: crypto.randomUUID(),
      name: file.name,
      blob,
    }
    await putAsset(ORIGINAL, asset)
    await deleteAsset(PROCESSED)

    const mode = getBackgroundConfig().mode
    updateBackground({
      imageId: asset.id,
      imageName: asset.name,
      mode: mode === "image" || mode === "pixel" ? mode : "pixel",
    })
  } finally {
    bitmap.close()
  }
}

function forgetImages() {
  for (const url of urls.values()) {
    URL.revokeObjectURL(url)
  }
  urls.clear()
}

/** Deletes the stored image. The other background settings are kept. */
export async function removeBackgroundImage(): Promise<void> {
  updateBackground({ imageId: null, imageName: null })
  forgetImages()
  await Promise.all([deleteAsset(ORIGINAL), deleteAsset(PROCESSED)])
}

/** Back to Node's default appearance: settings cleared, image deleted. */
export async function resetBackground(): Promise<void> {
  resetBackgroundConfig()
  forgetImages()
  await Promise.all([deleteAsset(ORIGINAL), deleteAsset(PROCESSED)])
}
