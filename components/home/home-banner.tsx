"use client"

import * as React from "react"
import { useTheme } from "next-themes"

// A dithered flow-field in the fumadocs.dev banner style, drawn once on a
// canvas (no animation loop) and centred on the Node wordmark. The texture is
// a domain-warped value-noise field — curving, silky ribbons rather than
// straight bands — rendered as ordered-dither pixels. Theme-aware: pixels are
// painted in the foreground colour over the card colour, so the same texture
// reads dark-on-light or light-on-dark.

// Ordered-dither thresholds in (0,1): a pixel lights when its value clears its
// matrix entry, which breaks the smooth field into the characteristic grain.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16))

const CELL = 4

function fract(n: number): number {
  return n - Math.floor(n)
}

// A cheap deterministic lattice hash in [0,1]. No dependency, stable render.
function hash(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Smooth value noise: hashed lattice corners, smoothstep-interpolated.
function noise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  return lerp(
    lerp(hash(xi, yi), hash(xi + 1, yi), u),
    lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u),
    v
  )
}

// A few octaves for structure at more than one scale.
function fbm(x: number, y: number): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let octave = 0; octave < 3; octave += 1) {
    sum += amp * noise(x * freq, y * freq)
    freq *= 2
    amp *= 0.5
  }
  return sum
}

/**
 * The flow field at a normalized point: fbm warped by fbm (Iñigo Quílez's
 * domain-warp), which bends the noise into flowing ribbons.
 */
function field(nx: number, ny: number): number {
  const x = nx * 2.6
  const y = ny * 1.5
  const qx = fbm(x, y)
  const qy = fbm(x + 5.2, y + 1.3)
  const rx = fbm(x + 3.4 * qx + 1.7, y + 3.4 * qy + 9.2)
  const ry = fbm(x + 3.4 * qx + 8.3, y + 3.4 * qy + 2.8)
  const v = fbm(x + 3.6 * rx, y + 3.6 * ry)
  // Pull the midtones into defined bright ribbons against a quiet ground,
  // with a faint grain floor so the whole panel reads as textured.
  const c = Math.max(0, Math.min(1, (v - 0.26) / 0.42))
  return 0.06 + 0.94 * c * c * (3 - 2 * c)
}

function paint(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement
  if (!parent) {
    return
  }
  const width = parent.clientWidth
  const height = parent.clientHeight
  if (width === 0 || height === 0) {
    return
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return
  }
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  // Pixel colour is the element's resolved foreground, so the texture flips
  // with the theme; density is applied per pixel via globalAlpha.
  ctx.fillStyle = getComputedStyle(canvas).color || "#888"

  const cols = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)
  const dot = CELL - 1

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = field(col / cols, row / rows)
      if (value <= BAYER[row % 4][col % 4]) {
        continue
      }
      ctx.globalAlpha = 0.1 + value * 0.82
      ctx.fillRect(col * CELL, row * CELL, dot, dot)
    }
  }
}

/**
 * The Node hero on Home: the brand mark and wordmark over a dithered flow
 * field. The canvas is aria-hidden and decorative; the wordmark is real text.
 */
export function HomeBanner() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas?.parentElement) {
      return
    }
    // Repaint after the theme class lands so the foreground colour is current.
    const frame = requestAnimationFrame(() => paint(canvas))
    const observer = new ResizeObserver(() => paint(canvas))
    observer.observe(canvas.parentElement)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [resolvedTheme])

  return (
    <section
      aria-label="Node"
      className="relative isolate flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border bg-card sm:min-h-52"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 size-full text-foreground"
        // Fade the texture away from the centre so the wordmark sits clean.
        style={{
          maskImage:
            "radial-gradient(130% 120% at 50% 50%, transparent 6%, rgba(0,0,0,0.55) 32%, #000 60%)",
        }}
      />
      <div className="relative flex items-center gap-3 text-foreground sm:gap-4">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="size-9 sm:size-11"
        >
          <path d="M12 8.003 4.288 4.002 12 0l7.713 4v8.004L12 16v8l-7.71-4v-8L12 16V8.003Z" />
        </svg>
        <span className="text-4xl font-bold tracking-tight sm:text-5xl">
          Node
        </span>
      </div>
    </section>
  )
}
