import type { Metadata } from "next"

import { RepositoryView } from "@/components/repositories/repository-view"

export const metadata: Metadata = { title: "Repository" }

function decode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default async function RepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ repositoryId: string; path?: string[] }>
  searchParams: Promise<{ search?: string | string[]; q?: string | string[] }>
}) {
  const { repositoryId, path } = await params
  const { search, q } = await searchParams

  return (
    <RepositoryView
      repositoryId={decode(repositoryId)}
      path={(path ?? []).map(decode).join("/")}
      search={search !== undefined}
      query={typeof q === "string" ? q : ""}
    />
  )
}
