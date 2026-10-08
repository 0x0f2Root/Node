"use client"

import { useSyncExternalStore } from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"

import { createPersistentStore } from "@/lib/utils/store"

export const TASK_STATUSES = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]["id"]

export const TASK_PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["id"]

// Every field is JSON-safe, so a task is stored exactly as it is used.
export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority?: TaskPriority
  /** A calendar day, "yyyy-MM-dd": due dates carry no time or time zone. */
  dueDate?: string
  /** ISO-8601 instants. */
  createdAt: string
  updatedAt: string
  /** The Node page this task is about, if any. */
  pageId?: string
}

export type TaskInput = Pick<
  Task,
  "title" | "description" | "status" | "priority" | "dueDate" | "pageId"
>

/** The board as the Kanban component takes it: column id to ordered tasks. */
export type TaskBoard = Record<string, Task[]>

const EMPTY: Task[] = []

// Same browser-local persistence as the rest of Node's client state. The
// array order is the order of cards within each column.
const store = createPersistentStore<Task[]>("node.tasks.v1", EMPTY)

export function useTasks(): Task[] {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer)
}

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString()
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  // New tasks go to the top of their column.
  store.set((tasks) => [task, ...tasks])
  return task
}

export function updateTask(id: string, input: Partial<TaskInput>) {
  store.set((tasks) =>
    tasks.map((task) =>
      task.id === id
        ? { ...task, ...input, updatedAt: new Date().toISOString() }
        : task
    )
  )
}

/** Follows pages that were renamed or moved; `remap` returns the new id. */
export function remapTaskPages(remap: (id: string) => string) {
  store.set((tasks) =>
    tasks.map((task) =>
      task.pageId ? { ...task, pageId: remap(task.pageId) } : task
    )
  )
}

export function deleteTask(id: string) {
  store.set((tasks) => tasks.filter((task) => task.id !== id))
}

/** Inserts a copy directly after the original, in the same column. */
export function duplicateTask(id: string) {
  store.set((tasks) => {
    const index = tasks.findIndex((task) => task.id === id)
    if (index < 0) {
      return tasks
    }
    const now = new Date().toISOString()
    const copy: Task = {
      ...tasks[index],
      id: crypto.randomUUID(),
      title: `${tasks[index].title} copy`,
      createdAt: now,
      updatedAt: now,
    }
    return [...tasks.slice(0, index + 1), copy, ...tasks.slice(index + 1)]
  })
}

/**
 * Saves the board after a drag. A card's column is its status, so moving a
 * card between columns changes its status here. Tasks hidden by a filter are
 * not in `board`; they keep their status and follow the visible cards.
 */
export function applyBoard(board: TaskBoard) {
  store.set((tasks) => {
    const onBoard = new Set(
      Object.values(board).flatMap((column) => column.map((task) => task.id))
    )
    const now = new Date().toISOString()

    return TASK_STATUSES.flatMap(({ id: status }) => [
      ...(board[status] ?? []).map((task) =>
        task.status === status ? task : { ...task, status, updatedAt: now }
      ),
      ...tasks.filter(
        (task) => task.status === status && !onBoard.has(task.id)
      ),
    ])
  })
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later"

const DUE_SOON_DAYS = 7

/** Where a task's due date stands relative to `now` (epoch ms). */
export function dueState(task: Task, now: number): DueState {
  if (!task.dueDate || !now) {
    return task.dueDate ? "later" : "none"
  }
  const days = differenceInCalendarDays(parseISO(task.dueDate), new Date(now))
  if (days < 0) {
    return "overdue"
  }
  if (days === 0) {
    return "today"
  }
  return days <= DUE_SOON_DAYS ? "soon" : "later"
}

/** "Oct 12", with the year when it is not the current one. */
export function formatDueDate(dueDate: string, now: number): string {
  const date = parseISO(dueDate)
  const sameYear = !now || date.getFullYear() === new Date(now).getFullYear()
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy")
}
