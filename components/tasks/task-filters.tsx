"use client"

import * as React from "react"

import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  dueState,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks/tasks"
import {
  ChevronDownIcon,
  ListFilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

// Which part of a task's schedule a card is about. "later" is a scheduled
// task that is neither overdue nor coming up soon.
export type DueKey = "overdue" | "today" | "soon" | "later"

const DUE_OPTIONS: { id: DueKey; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "soon", label: "Due soon" },
  { id: "later", label: "Scheduled" },
]

/**
 * The board's filters. Empty arrays mean "no constraint", so the default
 * state shows every task. Priority and due narrow the cards; status narrows
 * which columns are shown.
 */
export interface TaskFilterState {
  query: string
  priorities: TaskPriority[]
  statuses: TaskStatus[]
  due: DueKey[]
}

export const EMPTY_FILTER: TaskFilterState = {
  query: "",
  priorities: [],
  statuses: [],
  due: [],
}

export function isFilterActive(filter: TaskFilterState): boolean {
  return (
    filter.query.trim() !== "" ||
    filter.priorities.length > 0 ||
    filter.statuses.length > 0 ||
    filter.due.length > 0
  )
}

/** Whether a task passes the priority and due filters (not search or status). */
export function taskMatchesFilter(
  task: Task,
  filter: TaskFilterState,
  now: number
): boolean {
  if (filter.priorities.length > 0) {
    if (!task.priority || !filter.priorities.includes(task.priority)) {
      return false
    }
  }
  if (filter.due.length > 0) {
    // Due is about work still to do, so a finished task never matches.
    if (task.status === "done") {
      return false
    }
    const state = dueState(task, now)
    if (state === "none" || !filter.due.includes(state)) {
      return false
    }
  }
  return true
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

function Facet<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly { id: T; label: string }[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-dashed data-[popup-open]:border-solid"
          />
        }
      >
        <ListFilterIcon className="size-3.5 text-muted-foreground" />
        {label}
        {selected.length > 0 ? (
          <Badge variant="secondary" size="sm" className="tabular-nums">
            {selected.length}
          </Badge>
        ) : null}
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5">
        <div className="flex flex-col">
          {options.map((option) => {
            const checked = selected.includes(option.id)
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted has-[:focus-visible]:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onChange(toggle(selected, option.id))}
                />
                <span className="flex-1">{option.label}</span>
              </label>
            )
          })}
          {selected.length > 0 ? (
            <>
              <Separator className="my-1" />
              <Button
                variant="ghost"
                size="xs"
                className="justify-start text-muted-foreground"
                onClick={() => onChange([])}
              >
                Clear
              </Button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The filter bar above the board: search plus priority, status and due
 * facets. Everything applies live as it changes; status controls which
 * columns the board shows.
 */
export function TaskFilters({
  filter,
  onChange,
}: {
  filter: TaskFilterState
  onChange: (filter: TaskFilterState) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="h-8 w-full sm:w-56">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={filter.query}
          onChange={(event) =>
            onChange({ ...filter, query: event.target.value })
          }
          placeholder="Search tasks…"
          aria-label="Search tasks by title"
        />
      </InputGroup>

      <Facet
        label="Priority"
        options={TASK_PRIORITIES}
        selected={filter.priorities}
        onChange={(priorities) => onChange({ ...filter, priorities })}
      />
      <Facet
        label="Status"
        options={TASK_STATUSES}
        selected={filter.statuses}
        onChange={(statuses) => onChange({ ...filter, statuses })}
      />
      <Facet
        label="Due"
        options={DUE_OPTIONS}
        selected={filter.due}
        onChange={(due) => onChange({ ...filter, due })}
      />

      {isFilterActive(filter) ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onChange(EMPTY_FILTER)}
        >
          <XIcon data-icon="inline-start" />
          Clear all
        </Button>
      ) : null}
    </div>
  )
}
