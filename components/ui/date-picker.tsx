"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

// A date value is kept as "yyyy-MM-dd" (the same string the form state and
// the stores already use), so this is a drop-in replacement for the native
// <input type="date"> with a consistent, themed popup calendar.
const VALUE_FORMAT = "yyyy-MM-dd"

function parseValue(value: string): Date | undefined {
  if (!value) {
    return undefined
  }
  const date = parse(value, VALUE_FORMAT, new Date())
  return isValid(date) ? date : undefined
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  "aria-invalid": ariaInvalid,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  /** earliest selectable date, as "yyyy-MM-dd" */
  min?: string
  placeholder?: string
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const date = parseValue(value)
  const minDate = min ? parseValue(min) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            data-empty={date ? undefined : ""}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              "data-[empty]:text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        {date ? format(date, "EEE, MMM d, yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          autoFocus
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(next) => {
            if (next) {
              onChange(format(next, VALUE_FORMAT))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
