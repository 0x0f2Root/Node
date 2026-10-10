import type { Metadata } from "next"

import { WorkspaceView } from "@/components/home/workspace-view"

export const metadata: Metadata = { title: "Workspace" }

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>
}) {
  const { tag } = await searchParams

  return <WorkspaceView tag={typeof tag === "string" ? tag : undefined} />
}
