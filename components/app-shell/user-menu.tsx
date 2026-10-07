"use client"

import Link from "next/link"

import { useWorkspaceUI } from "@/components/app-shell/workspace-ui"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KeyboardIcon, SettingsIcon, UploadIcon, UserIcon } from "lucide-react"

// There are no accounts yet: the workspace belongs to this browser, and the
// menu says so instead of inventing a user.
export function UserMenu() {
  const { importMarkdown } = useWorkspaceUI()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Workspace menu"
        className="ml-1 rounded-full ring-ring/50 outline-none focus-visible:ring-3"
      >
        <Avatar className="size-7">
          <AvatarFallback>
            <UserIcon className="size-3.5" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Local workspace
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Stored in this browser
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings#shortcuts" />}>
          <KeyboardIcon />
          Keyboard shortcuts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={importMarkdown}>
          <UploadIcon />
          Import Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
