"use client"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon } from "lucide-react"

export const TASK_FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "High priority" },
  { id: "soon", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
] as const

export type TaskFilter = (typeof TASK_FILTERS)[number]["id"]

/** Title search and a quick filter, both applied to the board as you type. */
export function TaskFilters({
  query,
  onQueryChange,
  filter,
  onFilterChange,
}: {
  query: string
  onQueryChange: (query: string) => void
  filter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <InputGroup className="h-8 sm:w-64">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks by title"
        />
      </InputGroup>

      <Tabs
        value={filter}
        onValueChange={(next) => onFilterChange(next as TaskFilter)}
      >
        <TabsList aria-label="Filter tasks">
          {TASK_FILTERS.map((option) => (
            <TabsTrigger key={option.id} value={option.id} className="px-2.5">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
