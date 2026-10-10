"use client"

import * as React from "react"
import Link from "next/link"

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
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAncestors, pageHref } from "@/lib/pages/tree"
import { pageTitle, type Page } from "@/lib/pages/types"
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  createTask,
  deleteTask,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks/tasks"
import { ArrowUpRightIcon } from "lucide-react"

/** What the dialog is open for: a new task, an edit, or a delete confirmation. */
export type TaskDialogState =
  | { mode: "create"; status?: TaskStatus; pageId?: string }
  | { mode: "edit"; task: Task }
  | { mode: "delete"; task: Task }

const NONE = "none"

interface FormValues {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority | undefined
  dueDate: string
  pageId: string | undefined
}

function initialValues(
  state: Exclude<TaskDialogState, { mode: "delete" }>
): FormValues {
  if (state.mode === "edit") {
    const { task } = state
    return {
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      pageId: task.pageId,
    }
  }
  return {
    title: "",
    description: "",
    status: state.status ?? "todo",
    priority: undefined,
    dueDate: "",
    pageId: state.pageId,
  }
}

/** "Engineering / Architecture" */
function pageLabel(pages: Page[], page: Page): string {
  return [...getAncestors(pages, page.id), page].map(pageTitle).join(" / ")
}

function Field({
  label,
  htmlFor,
  required,
  action,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </Label>
        {action}
      </div>
      {children}
    </div>
  )
}

function TaskForm({
  state,
  pages,
  onClose,
  onRequestDelete,
}: {
  state: Exclude<TaskDialogState, { mode: "delete" }>
  pages: Page[]
  onClose: () => void
  onRequestDelete: (task: Task) => void
}) {
  const [values, setValues] = React.useState(() => initialValues(state))
  const [error, setError] = React.useState<string | null>(null)
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
      setError("Give the task a title.")
      return
    }

    const input = {
      title,
      description: values.description.trim() || undefined,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate || undefined,
      // A link to a page that no longer exists is dropped on save.
      pageId: linkedPage?.id,
    }

    if (state.mode === "edit") {
      updateTask(state.task.id, input)
    } else {
      createTask(input)
    }
    onClose()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
        <DialogDescription className="sr-only">
          {editing
            ? "Change this task's details, or delete it."
            : "Add a task to the board."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3.5">
        <Field label="Title" htmlFor={`${id}-title`} required>
          <Input
            id={`${id}-title`}
            value={values.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Write the deployment runbook"
            autoComplete="off"
            required
            aria-required="true"
            aria-invalid={error !== null}
            autoFocus={!editing}
          />
        </Field>

        <Field label="Description" htmlFor={`${id}-description`}>
          <Textarea
            id={`${id}-description`}
            value={values.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className="min-h-20 resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor={`${id}-status`}>
            <Select
              value={values.status}
              onValueChange={(next) => {
                if (next !== null) {
                  patch({ status: next as TaskStatus })
                }
              }}
            >
              <SelectTrigger id={`${id}-status`} className="w-full">
                {/* Base UI's Value renders the raw value by default. */}
                <SelectValue>
                  {
                    TASK_STATUSES.find((option) => option.id === values.status)
                      ?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Priority" htmlFor={`${id}-priority`}>
            <Select
              value={values.priority ?? NONE}
              onValueChange={(next) =>
                patch({
                  priority:
                    next === NONE || next === null
                      ? undefined
                      : (next as TaskPriority),
                })
              }
            >
              <SelectTrigger id={`${id}-priority`} className="w-full">
                <SelectValue>
                  {TASK_PRIORITIES.find(
                    (option) => option.id === values.priority
                  )?.label ?? "None"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {TASK_PRIORITIES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Due date"
          htmlFor={`${id}-due`}
          action={
            values.dueDate ? (
              <button
                type="button"
                onClick={() => patch({ dueDate: "" })}
                className="rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Clear
              </button>
            ) : null
          }
        >
          <DatePicker
            id={`${id}-due`}
            value={values.dueDate}
            onChange={(dueDate) => patch({ dueDate })}
            placeholder="No due date"
          />
        </Field>

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
            value={linkedPage?.id ?? NONE}
            onValueChange={(next) =>
              patch({
                pageId: next === NONE || next === null ? undefined : next,
              })
            }
          >
            <SelectTrigger id={`${id}-page`} className="w-full">
              <SelectValue>
                {linkedPage ? pageLabel(pages, linkedPage) : "No linked page"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No linked page</SelectItem>
              {pages.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  {pageLabel(pages, page)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="sm:justify-between">
        {state.mode === "edit" ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRequestDelete(state.task)}
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
            {editing ? "Save changes" : "Create task"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

/**
 * The task form (create and edit) and the delete confirmation. Only one is
 * open at a time: asking to delete from the form swaps to the confirmation.
 */
export function TaskDialog({
  state,
  pages,
  onStateChange,
}: {
  state: TaskDialogState | null
  pages: Page[]
  onStateChange: (state: TaskDialogState | null) => void
}) {
  const close = () => onStateChange(null)

  const form = state && state.mode !== "delete" ? state : null
  const removal = state?.mode === "delete" ? state : null

  // Keep rendering the last request while a dialog animates closed, so it
  // does not collapse to an empty box on the way out.
  const [shownForm, setShownForm] = React.useState(form)
  if (form !== null && form !== shownForm) {
    setShownForm(form)
  }
  const [shownRemoval, setShownRemoval] = React.useState(removal)
  if (removal !== null && removal !== shownRemoval) {
    setShownRemoval(removal)
  }
  const currentForm = form ?? shownForm
  const currentRemoval = removal ?? shownRemoval

  return (
    <>
      <Dialog open={form !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          {currentForm ? (
            <TaskForm
              // A fresh form for each task or new-task request.
              key={currentForm.mode === "edit" ? currentForm.task.id : "create"}
              state={currentForm}
              pages={pages}
              onClose={close}
              onRequestDelete={(task) =>
                onStateChange({ mode: "delete", task })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removal !== null}
        onOpenChange={(open) => !open && close()}
      >
        <AlertDialogContent>
          {currentRemoval ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete “{currentRemoval.task.title}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This task will be removed from the board. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    deleteTask(currentRemoval.task.id)
                    close()
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
