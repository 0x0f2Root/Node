"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { addDays, addHours, format, parseISO } from "date-fns"

import {
  CalendarEventDialog,
  type EventDialogState,
} from "@/components/calendar/calendar-event-dialog"
import {
  EventCalendar,
  type EventCalendarRenderEventProps,
} from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
} from "@/components/reui/event-calendar/event-calendar-types"
import { Button } from "@/components/ui/button"
import {
  eventColorValue,
  updateEvent,
  useCalendarEvents,
} from "@/lib/calendar/events"
import { usePagesState } from "@/lib/pages/store"
import { useTasks } from "@/lib/tasks/tasks"
import { useHydrated } from "@/lib/utils/client"
import {
  CircleCheckIcon,
  CircleIcon,
  FileTextIcon,
  PlusIcon,
} from "lucide-react"

/** What Node attaches to each event it hands the calendar. */
interface EventData {
  /** set only while the linked page still exists */
  linkedPageTitle?: string
  /** set when the entry is a task's due date rather than an event */
  task?: { done: boolean }
}

const TIME_FORMAT = "h:mm a"
const TASK_ID_PREFIX = "task:"

// Events linked to a page carry a small page glyph beside the title. Anything
// else returns undefined and keeps the calendar's built-in chip.
function renderLinkedEvent({
  occurrence,
  segment,
  view,
}: EventCalendarRenderEventProps<EventData>) {
  // A task due that day: a status glyph in place of the colour dot.
  const task = occurrence.event.data?.task
  if (task) {
    const Glyph = task.done ? CircleCheckIcon : CircleIcon
    return (
      <>
        <Glyph
          className="size-3 shrink-0 text-muted-foreground"
          aria-label={task.done ? "Task, done" : "Task"}
        />
        <span
          className={
            task.done
              ? "truncate text-muted-foreground line-through"
              : "truncate font-medium"
          }
        >
          {occurrence.event.title}
        </span>
      </>
    )
  }

  const linked = occurrence.event.data?.linkedPageTitle
  if (!linked) {
    return undefined
  }

  const glyph = (
    <FileTextIcon
      className="size-3 shrink-0 text-(--ec-event-color)"
      aria-label={`Linked to ${linked}`}
    />
  )
  const title = (
    <span className="truncate font-medium">{occurrence.event.title}</span>
  )

  // Timed block in a week or day grid: title, then the time range under it.
  if (view !== "month" && !occurrence.allDay) {
    return (
      <>
        <span className="flex min-w-0 items-center gap-1">
          {title}
          {glyph}
        </span>
        <span className="truncate text-muted-foreground">
          {format(occurrence.start, TIME_FORMAT)} –{" "}
          {format(occurrence.end, TIME_FORMAT)}
        </span>
      </>
    )
  }

  // Single-row chip: the glyph takes the place of the colour dot, so a linked
  // event costs the title no extra width in a narrow month cell.
  return (
    <>
      {glyph}
      {title}
      {!occurrence.allDay && segment.isStart ? (
        <span className="shrink-0 text-muted-foreground">
          {format(occurrence.start, TIME_FORMAT)}
        </span>
      ) : null}
    </>
  )
}

/**
 * The Calendar page. The ReUI Event Calendar is the surface and supplies the
 * views, navigation and drag gestures; Node supplies the events, the dialog,
 * and the link from an event to a page.
 */
export function CalendarView({ initialPageId }: { initialPageId?: string }) {
  const router = useRouter()
  const events = useCalendarEvents()
  const tasks = useTasks()
  const { pages } = usePagesState()
  const hydrated = useHydrated()

  // "Add to Calendar" on a page lands here with that page preselected.
  const [dialog, setDialog] = React.useState<EventDialogState | null>(() =>
    initialPageId ? { mode: "create", pageId: initialPageId } : null
  )

  const calendarEvents = React.useMemo<CalendarEvent<EventData>[]>(() => {
    const titles = new Map(pages.map((page) => [page.id, page.title]))
    const fromEvents = events.map((event): CalendarEvent<EventData> => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: eventColorValue(event.color),
      data: {
        linkedPageTitle: event.pageId ? titles.get(event.pageId) : undefined,
      },
    }))
    // Tasks with a due date show on that day, read-only: they are edited on
    // the Tasks board, which stays their one source of truth.
    const fromTasks = tasks.flatMap((task): CalendarEvent<EventData>[] => {
      if (!task.dueDate) {
        return []
      }
      const day = parseISO(task.dueDate)
      return [
        {
          id: `${TASK_ID_PREFIX}${task.id}`,
          title: task.title,
          start: day,
          end: addDays(day, 1),
          allDay: true,
          readOnly: true,
          color: eventColorValue(undefined),
          data: { task: { done: task.status === "done" } },
        },
      ]
    })
    return [...fromEvents, ...fromTasks]
  }, [events, tasks, pages])

  function closeDialog() {
    setDialog(null)
    if (initialPageId) {
      router.replace("/calendar")
    }
  }

  // Dragging or resizing an event in the calendar saves its new time.
  function onEventUpdate(update: EventCalendarProposedUpdate<EventData>) {
    if (update.event.id.startsWith(TASK_ID_PREFIX)) {
      return false
    }
    updateEvent(update.event.id, {
      start: update.start,
      end: update.end,
      allDay: update.allDay,
    })
  }

  return (
    <div className="flex h-[calc(100svh-3rem-2*var(--workspace-inset,0px))] min-h-[30rem] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Calendar</h1>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <PlusIcon data-icon="inline-start" />
          New event
        </Button>
      </header>

      {hydrated && calendarEvents.length === 0 ? (
        <p className="shrink-0 border-b px-4 py-2.5 text-sm text-muted-foreground sm:px-6">
          <span className="font-medium text-foreground">No events yet.</span>{" "}
          Create your first event to start organizing your workspace.
        </p>
      ) : null}

      <EventCalendar<EventData>
        events={calendarEvents}
        defaultView="month"
        weekStartsOn={1}
        scrollToHour={8}
        renderEvent={renderLinkedEvent}
        onEventUpdate={onEventUpdate}
        onEventClick={(occurrence) => {
          if (occurrence.eventId.startsWith(TASK_ID_PREFIX)) {
            router.push("/tasks")
            return
          }
          const event = events.find((item) => item.id === occurrence.eventId)
          if (event) {
            setDialog({ mode: "edit", event })
          }
        }}
        onSlotClick={(slot) =>
          setDialog({
            mode: "create",
            start: slot.date,
            end: slot.end ?? (slot.allDay ? slot.date : addHours(slot.date, 1)),
            allDay: slot.allDay,
          })
        }
        onSelectSlot={(slot) =>
          setDialog({
            mode: "create",
            start: slot.start,
            end: slot.end,
            allDay: slot.allDay,
          })
        }
        className="min-h-0 flex-1"
      >
        <EventCalendarNav className="sm:px-4" />
        <EventCalendarContent />
      </EventCalendar>

      <CalendarEventDialog state={dialog} pages={pages} onClose={closeDialog} />
    </div>
  )
}
