import type { BadgeProps } from "@/components/reui/badge"

// The colours a tag can have: the ReUI badge styles chosen for Node. The id
// is what gets stored; the variant is how the badge component draws it.
export const TAG_STYLES = [
  { id: "primary-light", label: "Neutral", variant: "primary-light" },
  { id: "info-light", label: "Violet", variant: "info-light" },
  { id: "info-dot", label: "Violet, dot", variant: "info-light", dot: true },
  { id: "success-light", label: "Green", variant: "success-light" },
  { id: "warning-light", label: "Yellow", variant: "warning-light" },
  { id: "destructive-light", label: "Red", variant: "destructive-light" },
  { id: "info", label: "Violet, solid", variant: "info" },
  { id: "success", label: "Green, solid", variant: "success" },
  { id: "warning", label: "Yellow, solid", variant: "warning" },
  { id: "info-outline", label: "Violet, outline", variant: "info-outline" },
  {
    id: "success-outline",
    label: "Green, outline",
    variant: "success-outline",
  },
  {
    id: "warning-outline",
    label: "Yellow, outline",
    variant: "warning-outline",
  },
  {
    id: "destructive-outline",
    label: "Red, outline",
    variant: "destructive-outline",
  },
] as const satisfies readonly {
  id: string
  label: string
  variant: NonNullable<BadgeProps["variant"]>
  dot?: boolean
}[]

export type TagStyleId = (typeof TAG_STYLES)[number]["id"]

export const DEFAULT_TAG_STYLE: TagStyleId = "primary-light"

export function tagStyle(id: string | undefined) {
  return TAG_STYLES.find((style) => style.id === id) ?? TAG_STYLES[0]
}
