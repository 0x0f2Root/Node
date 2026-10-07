"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/reui/badge"
import { Frame, FrameHeader, FrameTitle } from "@/components/reui/frame"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { TaskCard } from "@/components/tasks/task-card"
import {
  TaskDialog,
  type TaskDialogState,
} from "@/components/tasks/task-dialog"
import { TaskFilters, type TaskFilter } from "@/components/tasks/task-filters"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { usePagesState } from "@/lib/pages/store"
import {
  TASK_STATUSES,
  applyBoard,
  dueState,
  duplicateTask,
  useTasks,
  type Task,
  type TaskBoard,
  type TaskStatus,
} from "@/lib/tasks/tasks"
import { useHydrated } from "@/lib/utils/client"
import { useNow } from "@/lib/utils/time"
import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ListTodoIcon,
  PlusIcon,
} from "lucide-react"

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <CircleIcon className="size-4 text-muted-foreground" />,
  "in-progress": <CircleDotIcon className="size-4 text-muted-foreground" />,
  done: <CircleCheckIcon className="size-4 text-muted-foreground" />,
}

function matchesFilter(task: Task, filter: TaskFilter, now: number) {
  if (filter === "all") {
    return true
  }
  if (filter === "high") {
    return task.priority === "high"
  }
  // Due filters are about work still to do.
  if (task.status === "done") {
    return false
  }
  const state = dueState(task, now)
  return filter === "overdue"
    ? state === "overdue"
    : state === "today" || state === "soon"
}

/**
 * The Tasks page. The ReUI Kanban is the board and owns drag and drop; Node
 * supplies the tasks, the card, the dialog, and the link from a task to a page.
 */
export function TasksView({
  createRequest,
}: {
  /** set by "New Task" in the command palette; a new value opens the dialog */
  createRequest?: string
}) {
  const router = useRouter()
  const tasks = useTasks()
  const { pages } = usePagesState()
  const hydrated = useHydrated()
  const now = useNow()

  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<TaskFilter>("all")
  const [dialog, setDialog] = React.useState<TaskDialogState | null>(null)

  // Open the dialog once per request, including one made while already here.
  const [handledRequest, setHandledRequest] = React.useState<string>()
  if (createRequest && createRequest !== handledRequest) {
    setHandledRequest(createRequest)
    setDialog({ mode: "create" })
  }

  const needle = query.trim().toLowerCase()
  const filtering = needle !== "" || filter !== "all"

  const board = React.useMemo<TaskBoard>(() => {
    const visible = tasks.filter(
      (task) =>
        (!needle || task.title.toLowerCase().includes(needle)) &&
        matchesFilter(task, filter, now)
    )
    return Object.fromEntries(
      TASK_STATUSES.map(({ id }) => [
        id,
        visible.filter((task) => task.status === id),
      ])
    )
  }, [tasks, needle, filter, now])

  const pagesById = React.useMemo(
    () => new Map(pages.map((page) => [page.id, page])),
    [pages]
  )

  function onDialogChange(next: TaskDialogState | null) {
    setDialog(next)
    if (next === null && createRequest) {
      router.replace("/tasks")
    }
  }

  const shownCount = Object.values(board).reduce(
    (total, column) => total + column.length,
    0
  )

  return (
    <div className="flex min-h-[calc(100svh-3rem)] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage your work and track progress.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <PlusIcon data-icon="inline-start" />
          New task
        </Button>
      </header>

      {hydrated && tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodoIcon />
            </EmptyMedia>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>
              Create your first task and start organizing your work.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
              <PlusIcon data-icon="inline-start" />
              New task
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
          <TaskFilters
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
          />

          {filtering && shownCount === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              No tasks match the current search and filter.
            </p>
          ) : null}

          <Kanban
            value={board}
            onValueChange={applyBoard}
            getItemValue={(task) => task.id}
          >
            {/* Columns stretch to one height, so a short column is still a
                full-height drop target. */}
            <KanbanBoard className="grid grid-cols-1 content-start gap-3 md:auto-rows-[minmax(18rem,auto)] md:grid-cols-3">
              {TASK_STATUSES.map(({ id: status, label }) => {
                const column = board[status] ?? []
                return (
                  <KanbanColumn key={status} value={status}>
                    <Frame spacing="sm" className="h-full">
                      <FrameHeader className="flex flex-row items-center gap-2">
                        {STATUS_ICON[status]}
                        <FrameTitle>{label}</FrameTitle>
                        <Badge variant="outline" size="sm">
                          {column.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto text-muted-foreground"
                          aria-label={`New task in ${label}`}
                          onClick={() => setDialog({ mode: "create", status })}
                        >
                          <PlusIcon />
                        </Button>
                      </FrameHeader>
                      <KanbanColumnContent
                        value={status}
                        className="flex min-h-20 flex-col gap-2 p-0.5"
                      >
                        {column.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            page={
                              task.pageId
                                ? pagesById.get(task.pageId)
                                : undefined
                            }
                            now={now}
                            onEdit={() => setDialog({ mode: "edit", task })}
                            onDuplicate={() => duplicateTask(task.id)}
                            onDelete={() => setDialog({ mode: "delete", task })}
                          />
                        ))}
                        {column.length === 0 ? (
                          <p className="flex flex-1 items-center justify-center rounded-md border border-dashed px-3 py-6 text-xs text-muted-foreground">
                            {filtering ? "No matching tasks" : "No tasks"}
                          </p>
                        ) : null}
                      </KanbanColumnContent>
                    </Frame>
                  </KanbanColumn>
                )
              })}
            </KanbanBoard>
            <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/10" />
          </Kanban>
        </div>
      )}

      <TaskDialog state={dialog} pages={pages} onStateChange={onDialogChange} />
    </div>
  )
}
