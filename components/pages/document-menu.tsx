"use client"

import { PageMenuItems } from "@/components/pages/page-menu-items"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Page } from "@/lib/pages/types"
import { MoreHorizontalIcon } from "lucide-react"

/** The open document's "more" menu in the topbar. */
export function DocumentMenu({ page }: { page: Page }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Page actions" />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <PageMenuItems
          page={page}
          Item={DropdownMenuItem}
          Separator={DropdownMenuSeparator}
          showExport
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
