"use client"

import * as React from "react"
import Link from "next/link"

import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"
import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { pageHref } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import {
  TASK_PRIORITIES,
  dueState,
  formatDueDate,
  type Task,
  type TaskPriority,
} from "@/lib/tasks/tasks"
import { cn } from "@/lib/utils"
import {
  CalendarIcon,
  CopyIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

const PRIORITY_VARIANT: Record<
  TaskPriority,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  low: "outline",
  medium: "warning-light",
  high: "destructive-light",
}

// Marks controls inside a card (menu, links) whose clicks must not also
// open the card for editing. Menu items render in a portal, but their React
// events still bubble to the card, so the menu content carries it too.
const CARD_ACTION = { "data-card-action": "" }

function isCardAction(target: EventTarget) {
  return target instanceof Element && target.closest("[data-card-action]")
}

function DueDate({ task, now }: { task: Task; now: number }) {
  if (!task.dueDate) {
    return null
  }
  // A finished task is never "overdue".
  const state = task.status === "done" ? "later" : dueState(task, now)
  const date = formatDueDate(task.dueDate, now)

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        state === "overdue" && "text-destructive",
        state === "today" && "font-medium text-foreground"
      )}
    >
      <CalendarIcon className="size-3" aria-hidden="true" />
      {state === "overdue" ? `Overdue · ${date}` : null}
      {state === "today" ? "Today" : null}
      {state !== "overdue" && state !== "today" ? date : null}
    </span>
  )
}

/** One task on the board: draggable by the whole card, click to edit. */
export function TaskCard({
  task,
  page,
  now,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  task: Task
  /** the linked page, when it still exists */
  page: Page | undefined
  now: number
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const priority = TASK_PRIORITIES.find((option) => option.id === task.priority)
  const hasMeta = priority !== undefined || task.dueDate !== undefined || page

  return (
    <KanbanItem value={task.id}>
      <KanbanItemHandle>
        <Frame variant="ghost" spacing="sm" className="p-0">
          <FramePanel
            className="group/task p-3"
            onClick={(event) => {
              if (!isCardAction(event.target)) {
                onEdit()
              }
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium break-words",
                    task.status === "done" && "text-muted-foreground"
                  )}
                >
                  {task.title}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    {...CARD_ACTION}
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="-mt-0.5 -mr-1 text-muted-foreground group-hover/task:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 md:opacity-0"
                        aria-label={`Actions for ${task.title}`}
                      />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    {...CARD_ACTION}
                    align="end"
                    className="w-44"
                  >
                    <DropdownMenuItem onClick={onEdit}>
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDuplicate}>
                      <CopyIcon />
                      Duplicate
                    </DropdownMenuItem>
                    {page ? (
                      <DropdownMenuItem
                        render={<Link href={pageHref(page.id)} />}
                      >
                        <FileTextIcon />
                        Open page
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2Icon />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {task.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {task.description}
                </p>
              ) : null}

              {hasMeta ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {priority ? (
                    <Badge variant={PRIORITY_VARIANT[priority.id]} size="sm">
                      {priority.label}
                    </Badge>
                  ) : null}
                  <DueDate task={task} now={now} />
                  {page ? (
                    <Link
                      {...CARD_ACTION}
                      href={pageHref(page.id)}
                      className="flex min-w-0 items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <FileTextIcon
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{pageTitle(page)}</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FramePanel>
        </Frame>
      </KanbanItemHandle>
    </KanbanItem>
  )
}
