"use client"

import * as React from "react"
import Link from "next/link"
import { addDays, addHours, format, startOfDay, startOfHour } from "date-fns"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  EVENT_COLORS,
  createEvent,
  deleteEvent,
  updateEvent,
  type EventColorId,
  type NodeEvent,
} from "@/lib/calendar/events"
import { getAncestors, pageHref } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import { ArrowUpRightIcon, CheckIcon } from "lucide-react"

/** What the dialog is open for: a new event (optionally prefilled) or an edit. */
export type EventDialogState =
  | {
      mode: "create"
      start?: Date
      end?: Date
      allDay?: boolean
      pageId?: string
    }
  | { mode: "edit"; event: NodeEvent }

const NO_PAGE = "none"
const DATE_FORMAT = "yyyy-MM-dd"
const TIME_FORMAT = "HH:mm"

interface FormValues {
  title: string
  date: string
  endDate: string
  startTime: string
  endTime: string
  allDay: boolean
  color: EventColorId
  pageId: string | undefined
  description: string
}

function initialValues(state: EventDialogState): FormValues {
  const source = state.mode === "edit" ? state.event : state
  // A new event with no slot starts at the next full hour and lasts one.
  const start = source.start ?? addHours(startOfHour(new Date()), 1)
  const end = source.end ?? addHours(start, 1)
  const allDay = source.allDay ?? false
  // All-day events end at an exclusive midnight; the form shows the last day.
  const lastDay = allDay && end > start ? addDays(end, -1) : end

  return {
    title: state.mode === "edit" ? state.event.title : "",
    date: format(start, DATE_FORMAT),
    endDate: format(lastDay < start ? start : lastDay, DATE_FORMAT),
    startTime: format(
      allDay ? addHours(startOfDay(start), 9) : start,
      TIME_FORMAT
    ),
    endTime: format(
      allDay ? addHours(startOfDay(start), 10) : end,
      TIME_FORMAT
    ),
    allDay,
    color: (state.mode === "edit" ? state.event.color : undefined) ?? "default",
    pageId: source.pageId,
    description: state.mode === "edit" ? (state.event.description ?? "") : "",
  }
}

/** "Engineering / Architecture" */
function pageLabel(pages: Page[], page: Page): string {
  return [...getAncestors(pages, page.id), page].map(pageTitle).join(" / ")
}

function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string
  htmlFor: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action}
      </div>
      {children}
    </div>
  )
}

function EventForm({
  state,
  pages,
  onClose,
}: {
  state: EventDialogState
  pages: Page[]
  onClose: () => void
}) {
  const [values, setValues] = React.useState(() => initialValues(state))
  const [error, setError] = React.useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const id = React.useId()

  const editing = state.mode === "edit"
  const linkedPage = pages.find((page) => page.id === values.pageId)

  function patch(next: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...next }))
    setError(null)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = values.title.trim()
    if (!title) {
      setError("Give the event a title.")
      return
    }

    let start: Date
    let end: Date
    if (values.allDay) {
      start = new Date(`${values.date}T00:00`)
      const lastDay = new Date(`${values.endDate || values.date}T00:00`)
      if (lastDay < start) {
        setError("The end date must be on or after the start date.")
        return
      }
      end = addDays(lastDay, 1)
    } else {
      start = new Date(`${values.date}T${values.startTime}`)
      end = new Date(`${values.date}T${values.endTime}`)
      if (end <= start) {
        setError("The end time must be after the start time.")
        return
      }
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Enter a valid date and time.")
      return
    }

    const input = {
      title,
      description: values.description.trim() || undefined,
      start,
      end,
      allDay: values.allDay,
      color: values.color === "default" ? undefined : values.color,
      // A link to a page that no longer exists is dropped on save.
      pageId: linkedPage?.id,
    }

    if (state.mode === "edit") {
      updateEvent(state.event.id, input)
    } else {
      createEvent(input)
    }
    onClose()
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Change this event's details, or delete it."
              : "Add an event to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <Field label="Title" htmlFor={`${id}-title`}>
            <Input
              id={`${id}-title`}
              value={values.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Architecture review"
              autoComplete="off"
              autoFocus={!editing}
            />
          </Field>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${id}-all-day`}>All day</Label>
            <Switch
              id={`${id}-all-day`}
              checked={values.allDay}
              onCheckedChange={(allDay) => patch({ allDay })}
            />
          </div>

          {values.allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts" htmlFor={`${id}-date`}>
                <Input
                  id={`${id}-date`}
                  type="date"
                  required
                  value={values.date}
                  onChange={(event) =>
                    patch({
                      date: event.target.value,
                      // Keep the end from falling before the new start.
                      endDate:
                        values.endDate < event.target.value
                          ? event.target.value
                          : values.endDate,
                    })
                  }
                />
              </Field>
              <Field label="Ends" htmlFor={`${id}-end-date`}>
                <Input
                  id={`${id}-end-date`}
                  type="date"
                  required
                  min={values.date}
                  value={values.endDate}
                  onChange={(event) => patch({ endDate: event.target.value })}
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="col-span-2 sm:col-span-1">
                <Field label="Date" htmlFor={`${id}-date`}>
                  <Input
                    id={`${id}-date`}
                    type="date"
                    required
                    value={values.date}
                    onChange={(event) =>
                      patch({
                        date: event.target.value,
                        endDate: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Start" htmlFor={`${id}-start`}>
                <Input
                  id={`${id}-start`}
                  type="time"
                  required
                  value={values.startTime}
                  onChange={(event) => patch({ startTime: event.target.value })}
                />
              </Field>
              <Field label="End" htmlFor={`${id}-end`}>
                <Input
                  id={`${id}-end`}
                  type="time"
                  required
                  value={values.endTime}
                  onChange={(event) => patch({ endTime: event.target.value })}
                />
              </Field>
            </div>
          )}

          <Field
            label="Linked page"
            htmlFor={`${id}-page`}
            action={
              linkedPage ? (
                <Link
                  href={pageHref(linkedPage.id)}
                  className="flex items-center gap-0.5 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Open page
                  <ArrowUpRightIcon className="size-3" aria-hidden="true" />
                </Link>
              ) : null
            }
          >
            <Select
              value={linkedPage?.id ?? NO_PAGE}
              onValueChange={(next) =>
                patch({
                  pageId: next === NO_PAGE || next === null ? undefined : next,
                })
              }
            >
              <SelectTrigger id={`${id}-page`} className="w-full">
                {/* Base UI's Value renders the raw value by default. */}
                <SelectValue>
                  {linkedPage ? pageLabel(pages, linkedPage) : "No linked page"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PAGE}>No linked page</SelectItem>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {pageLabel(pages, page)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center justify-between gap-4">
            <span id={`${id}-color`} className="text-sm font-medium">
              Color
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${id}-color`}
              className="flex items-center gap-1"
            >
              {EVENT_COLORS.map((color) => {
                const selected = values.color === color.id
                return (
                  <button
                    key={color.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={color.label}
                    title={color.label}
                    onClick={() => patch({ color: color.id })}
                    className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex size-4.5 items-center justify-center rounded-full text-background"
                      style={{ backgroundColor: color.value }}
                    >
                      {selected ? (
                        <CheckIcon className="size-3" aria-hidden="true" />
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Field label="Description" htmlFor={`${id}-description`}>
            <Textarea
              id={`${id}-description`}
              value={values.description}
              onChange={(event) => patch({ description: event.target.value })}
              rows={3}
              className="min-h-20 resize-none"
            />
          </Field>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </DialogFooter>
      </form>

      {state.mode === "edit" ? (
        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{state.event.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This event will be removed from your calendar. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  deleteEvent(state.event.id)
                  setConfirmingDelete(false)
                  onClose()
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}

/** Create or edit an event; editing also offers delete, behind a confirmation. */
export function CalendarEventDialog({
  state,
  pages,
  onClose,
}: {
  state: EventDialogState | null
  pages: Page[]
  onClose: () => void
}) {
  // Keep rendering the last request while the dialog animates closed, so it
  // does not collapse to an empty box on the way out.
  const [shown, setShown] = React.useState(state)
  if (state !== null && state !== shown) {
    setShown(state)
  }
  const current = state ?? shown

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {current ? (
          <EventForm
            // A fresh form for each event or new-event request.
            key={current.mode === "edit" ? current.event.id : "create"}
            state={current}
            pages={pages}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
