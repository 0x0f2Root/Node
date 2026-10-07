import type { Metadata } from "next"

import { CalendarView } from "@/components/calendar/calendar-view"

export const metadata: Metadata = { title: "Calendar" }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const { page } = await searchParams

  return (
    <CalendarView initialPageId={typeof page === "string" ? page : undefined} />
  )
}
