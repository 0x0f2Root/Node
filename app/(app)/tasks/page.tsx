import type { Metadata } from "next"

import { TasksView } from "@/components/tasks/tasks-view"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[] }>
}) {
  const { new: createRequest } = await searchParams

  return (
    <TasksView
      createRequest={
        typeof createRequest === "string" ? createRequest : undefined
      }
    />
  )
}
