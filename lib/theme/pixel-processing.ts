import {
  PALETTES,
  type Dithering,
  type PaletteId,
  type PixelStyle,
  type Rgb,
} from "@/lib/theme/background"

export interface PixelOptions {
  style: PixelStyle
  /** 1 (subtle) to 5 (extreme) */
  size: number
  palette: PaletteId
  /** palette size for the Automatic and Monochrome palettes */
  colors: number
  dithering: Dithering
  /** -50 to 50 */
  contrast: number
  saturation: number
  brightness: number
}

// The picture is rebuilt on a grid sized for a 1920px-wide screen. These are
// the block sizes, in screen pixels, per pixel-size step. 8-bit works on a
// much coarser grid than 16-bit, which is most of what tells them apart.
const REFERENCE_WIDTH = 1920
const BLOCK_SIZE: Record<PixelStyle, readonly number[]> = {
  "8bit": [5, 8, 12, 16, 24],
  "16bit": [2, 3, 4, 6, 8],
}

// 4x4 Bayer matrix: an ordered dither. It adds a fixed, repeating threshold
// pattern instead of random noise, which is what gives classic pixel art its
// regular cross-hatched gradients.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

const DITHER_STRENGTH: Record<Dithering, number> = {
  off: 0,
  low: 0.35,
  medium: 0.7,
  high: 1.1,
}
const DITHER_SPREAD: Record<PixelStyle, number> = { "8bit": 56, "16bit": 24 }

const MAX_SAMPLES = 16384

function clamp(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : value
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Brightness, contrast and saturation, applied before the palette. */
function adjust(data: Uint8ClampedArray, options: PixelOptions) {
  const { brightness, contrast, saturation } = options
  if (brightness === 0 && contrast === 0 && saturation === 0) {
    return
  }
  const offset = brightness * 1.6
  const c = contrast * 2.2
  const gain = (259 * (c + 255)) / (255 * (259 - c))
  const vivid = 1 + saturation / 50

  for (let i = 0; i < data.length; i += 4) {
    let r = gain * (data[i] - 128) + 128 + offset
    let g = gain * (data[i + 1] - 128) + 128 + offset
    let b = gain * (data[i + 2] - 128) + 128 + offset
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * vivid
    g = gray + (g - gray) * vivid
    b = gray + (b - gray) * vivid
    data[i] = clamp(r)
    data[i + 1] = clamp(g)
    data[i + 2] = clamp(b)
  }
}

/**
 * Median cut: picks `count` colours that represent the image by repeatedly
 * splitting the group of pixels with the widest colour range at its median.
 */
function medianCut(data: Uint8ClampedArray, count: number): Rgb[] {
  const pixels = data.length / 4
  const step = Math.max(1, Math.floor(pixels / MAX_SAMPLES))
  const samples: number[][] = []
  for (let p = 0; p < pixels; p += step) {
    samples.push([data[p * 4], data[p * 4 + 1], data[p * 4 + 2]])
  }

  const boxes: number[][][] = [samples]
  while (boxes.length < count) {
    let target = -1
    let channel = 0
    let widest = 0
    boxes.forEach((box, index) => {
      if (box.length < 2) {
        return
      }
      for (let ch = 0; ch < 3; ch += 1) {
        let min = 255
        let max = 0
        for (const sample of box) {
          if (sample[ch] < min) min = sample[ch]
          if (sample[ch] > max) max = sample[ch]
        }
        if (max - min > widest) {
          widest = max - min
          target = index
          channel = ch
        }
      }
    })
    if (target < 0) {
      break
    }
    const box = boxes[target]
    box.sort((a, b) => a[channel] - b[channel])
    const middle = box.length >> 1
    boxes.splice(target, 1, box.slice(0, middle), box.slice(middle))
  }

  return boxes.map((box): Rgb => {
    let r = 0
    let g = 0
    let b = 0
    for (const sample of box) {
      r += sample[0]
      g += sample[1]
      b += sample[2]
    }
    const n = Math.max(1, box.length)
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  })
}

function resolvePalette(
  data: Uint8ClampedArray,
  options: PixelOptions
): readonly Rgb[] {
  const preset = PALETTES.find((palette) => palette.id === options.palette)
  if (preset?.colors) {
    return preset.colors
  }
  if (options.palette === "mono") {
    const levels = Math.min(16, Math.max(2, Math.round(options.colors / 4)))
    return Array.from({ length: levels }, (_, index): Rgb => {
      const value = Math.round((index / (levels - 1)) * 255)
      return [value, value, value]
    })
  }
  return medianCut(data, options.colors)
}

/** Snaps every pixel to its nearest palette colour, with ordered dithering. */
function quantize(
  image: ImageData,
  palette: readonly Rgb[],
  options: PixelOptions
) {
  const { data, width, height } = image
  const amount =
    DITHER_STRENGTH[options.dithering] * DITHER_SPREAD[options.style]
  // Nearest-colour lookups repeat constantly; remember them per 15-bit colour.
  const nearest = new Int16Array(32768).fill(-1)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const threshold =
        amount === 0 ? 0 : (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * amount
      const r = clamp(data[i] + threshold)
      const g = clamp(data[i + 1] + threshold)
      const b = clamp(data[i + 2] + threshold)

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      let index = nearest[key]
      if (index < 0) {
        let best = Infinity
        for (let p = 0; p < palette.length; p += 1) {
          const dr = r - palette[p][0]
          const dg = g - palette[p][1]
          const db = b - palette[p][2]
          // Weighted towards green, where the eye is most sensitive.
          const distance = dr * dr * 3 + dg * dg * 6 + db * db
          if (distance < best) {
            best = distance
            index = p
          }
        }
        nearest[key] = index
      }

      data[i] = palette[index][0]
      data[i + 1] = palette[index][1]
      data[i + 2] = palette[index][2]
      data[i + 3] = 255
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the image.")),
      type,
      quality
    )
  })
}

/**
 * Turns a picture into pixel art:
 *
 *   downscale to a coarse grid -> adjust -> reduce to a palette (optionally
 *   dithered) -> upscale with nearest-neighbour, so every grid cell becomes a
 *   hard-edged block.
 *
 * It runs once per image and settings combination; the result is a static PNG.
 */
export async function pixelate(
  source: ImageBitmap,
  options: PixelOptions
): Promise<Blob> {
  const step = Math.min(5, Math.max(1, Math.round(options.size))) - 1
  const block = BLOCK_SIZE[options.style][step]
  const gridWidth = Math.max(16, Math.round(REFERENCE_WIDTH / block))
  const gridHeight = Math.max(
    9,
    Math.round((gridWidth * source.height) / source.width)
  )

  // 1. Downscale. Smoothing here averages each cell's source pixels.
  const grid = createCanvas(gridWidth, gridHeight)
  const gridContext = grid.getContext("2d", { willReadFrequently: true })
  if (!gridContext) {
    throw new Error("Canvas is not available in this browser.")
  }
  gridContext.imageSmoothingEnabled = true
  gridContext.imageSmoothingQuality = "high"
  gridContext.drawImage(source, 0, 0, gridWidth, gridHeight)

  // 2. Adjust and 3. reduce the colours.
  const image = gridContext.getImageData(0, 0, gridWidth, gridHeight)
  adjust(image.data, options)
  quantize(image, resolvePalette(image.data, options), options)
  gridContext.putImageData(image, 0, 0)

  // 4. Upscale by a whole number with smoothing off: hard pixel edges.
  const output = createCanvas(gridWidth * block, gridHeight * block)
  const outputContext = output.getContext("2d")
  if (!outputContext) {
    throw new Error("Canvas is not available in this browser.")
  }
  outputContext.imageSmoothingEnabled = false
  outputContext.drawImage(grid, 0, 0, output.width, output.height)

  return toBlob(output, "image/png")
}

const MAX_EDGE = 2560

/**
 * Re-encodes an upload as a plain raster image: capped in size, metadata
 * dropped, and animated files flattened to their first frame.
 */
export async function normalizeImage(source: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height))
  const canvas = createCanvas(
    Math.max(1, Math.round(source.width * scale)),
    Math.max(1, Math.round(source.height * scale))
  )
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas is not available in this browser.")
  }
  context.imageSmoothingQuality = "high"
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return toBlob(canvas, "image/webp", 0.9)
}
