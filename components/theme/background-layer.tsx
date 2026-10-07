"use client"

import * as React from "react"

import {
  SOLID_COLORS,
  useBackgroundConfig,
  type BackgroundConfig,
} from "@/lib/theme/background"
import {
  ensureBackgroundImage,
  useBackgroundImage,
} from "@/lib/theme/background-image"
import { cn } from "@/lib/utils"

const FIT_SIZE: Record<BackgroundConfig["fit"], string> = {
  cover: "cover",
  contain: "contain",
  fill: "100% 100%",
}

/**
 * Paints a background configuration: the colour or image, then the overlay,
 * the fade into the app background, and the vignette. Everything here is
 * static CSS on an already-finished image, so it costs nothing per frame.
 *
 * The workspace and the Settings preview both render this one component.
 */
export function BackgroundLayer({
  config,
  url,
  className,
}: {
  config: BackgroundConfig
  url: string | null
  className?: string
}) {
  if (config.mode === "none") {
    return null
  }

  const solid =
    config.mode === "solid"
      ? (SOLID_COLORS.find((color) => color.id === config.solid)?.value ??
        SOLID_COLORS[0].value)
      : null

  return (
    <div
      aria-hidden="true"
      data-workspace-background-layer=""
      className={cn("pointer-events-none overflow-hidden", className)}
    >
      {solid ? (
        <div className="absolute inset-0" style={{ backgroundColor: solid }} />
      ) : null}

      {!solid && url ? (
        <div
          // Blurring softens the edges of the box too; overscan hides that.
          className={cn("absolute", config.blur > 0 ? "-inset-6" : "inset-0")}
          style={{
            backgroundImage: `url("${url}")`,
            backgroundSize: FIT_SIZE[config.fit],
            backgroundPosition: config.position,
            backgroundRepeat: "no-repeat",
            opacity: config.opacity / 100,
            filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
            // Keeps the processed blocks hard when the image is scaled.
            imageRendering: config.mode === "pixel" ? "pixelated" : undefined,
          }}
        />
      ) : null}

      {!solid && config.overlay && config.overlayOpacity > 0 ? (
        // The overlay is the theme's own background colour: dark in dark
        // mode, light in light mode.
        <div
          className="absolute inset-0 bg-background"
          style={{ opacity: config.overlayOpacity / 100 }}
        />
      ) : null}

      {!solid && config.fade > 0 ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 0%, var(--background) ${
              100 - config.fade * 0.7
            }%)`,
          }}
        />
      ) : null}

      {!solid && config.vignette > 0 ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / ${
              (config.vignette / 100) * 0.7
            }) 100%)`,
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * The background behind the main workspace. It is fixed to the viewport and
 * sits under the page content; the sidebar, topbar and every popup keep
 * their own solid surfaces.
 */
export function WorkspaceBackground() {
  const config = useBackgroundConfig()
  const { url } = useBackgroundImage()

  // The single place that asks for the image. It is a no-op unless the image
  // itself would change, so moving between pages never reprocesses anything.
  React.useEffect(() => {
    ensureBackgroundImage(config)
  }, [config])

  return (
    <BackgroundLayer
      config={config}
      url={url}
      className="fixed inset-0 -z-10"
    />
  )
}
