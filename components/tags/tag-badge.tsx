"use client"

import { Badge, type BadgeProps } from "@/components/reui/badge"
import { tagStyle } from "@/lib/tags/styles"
import { useTagStyles } from "@/lib/tags/store"

/** A badge drawn in one of the tag styles. */
export function StyledBadge({
  styleId,
  children,
  ...props
}: Omit<BadgeProps, "variant"> & { styleId: string | undefined }) {
  const style = tagStyle(styleId)

  return (
    <Badge variant={style.variant} {...props}>
      {"dot" in style ? (
        <span
          className="ms-0.25 size-1.25 rounded-full! bg-[currentColor]"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Badge>
  )
}

/** A tag, in the colour chosen for it. */
export function TagBadge({
  name,
  ...props
}: Omit<BadgeProps, "variant" | "children"> & { name: string }) {
  const styles = useTagStyles()

  return (
    <StyledBadge styleId={styles[name]} {...props}>
      {name}
    </StyledBadge>
  )
}

/** A page's tags in a row; renders nothing when it has none. */
export function TagList({
  tags,
  className,
}: {
  tags: string[] | undefined
  className?: string
}) {
  if (!tags || tags.length === 0) {
    return null
  }
  return (
    <span className={className ?? "flex flex-wrap items-center gap-1"}>
      {tags.map((tag) => (
        <TagBadge key={tag} name={tag} size="sm" />
      ))}
    </span>
  )
}
