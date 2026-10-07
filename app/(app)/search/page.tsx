import type { Metadata } from "next"

import { GlobalSearch } from "@/components/search/global-search"

export const metadata: Metadata = { title: "Search" }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const { q } = await searchParams

  return <GlobalSearch initialQuery={typeof q === "string" ? q : ""} />
}
