import { IconTile } from "@/components/reui/icon-tile"
import { PackageIcon } from "lucide-react"

const variants = ["outline", "elevated", "soft", "solid", "frame"] as const

export function Pattern() {
  return (
    <div className="flex items-center justify-center gap-4">
      {variants.map((variant) => (
        <IconTile key={variant} variant={variant} aria-hidden="true">
          <PackageIcon
          />
        </IconTile>
      ))}
    </div>
  )
}