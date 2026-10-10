"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { usePageParams } from "@/components/pages/use-page-params"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toolForPath } from "@/lib/tools/registry"
import { usePagesState } from "@/lib/pages/store"
import { WORKSPACE_LABEL, getAncestors, pageHref } from "@/lib/pages/tree"
import { pageTitle } from "@/lib/pages/types"
import { useRepositories } from "@/lib/repositories/store"
import { repositoryHref } from "@/lib/repositories/types"

interface Crumb {
  label: string
  href?: string
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const STATIC_ROUTES: Record<string, string> = {
  "/": "Home",
  "/search": "Search",
  "/calendar": "Calendar",
  "/tasks": "Tasks",
  "/settings": "Settings",
}

/** The current location: Workspace / Engineering / Architecture. */
export function AppBreadcrumbs() {
  const pathname = usePathname()
  const params = usePageParams()
  const { pages } = usePagesState()
  const repositories = useRepositories()

  const crumbs = React.useMemo<Crumb[]>(() => {
    const staticLabel = STATIC_ROUTES[pathname]
    if (staticLabel) {
      return [{ label: staticLabel }]
    }

    const tool = toolForPath(pathname)
    if (tool) {
      return [{ label: "Tools" }, { label: tool.name }]
    }

    // /repositories/<id>/<path…>: repository / folder / file
    const [, section, rawId, ...rawPath] = pathname.split("/")
    if (section === "repositories" && rawId) {
      const id = safeDecode(rawId)
      const segments = rawPath.map(safeDecode)
      const name =
        repositories.find((source) => source.id === id)?.name ?? "Repository"
      return [
        segments.length > 0
          ? { label: name, href: repositoryHref(id) }
          : { label: name },
        ...segments.map((segment, index): Crumb => {
          const last = index === segments.length - 1
          return last
            ? { label: segment }
            : {
                label: segment,
                href: repositoryHref(
                  id,
                  segments.slice(0, index + 1).join("/")
                ),
              }
        }),
      ]
    }
    if (!params.pageId) {
      return [{ label: WORKSPACE_LABEL }]
    }

    const page = pages.find((candidate) => candidate.id === params.pageId)
    // Workspace / Folder / Page: every crumb but the last is a link.
    const trail: Crumb[] = []
    if (page) {
      for (const ancestor of getAncestors(pages, page.id)) {
        trail.push({ label: pageTitle(ancestor), href: pageHref(ancestor.id) })
      }
      trail.push({ label: pageTitle(page) })
    }
    return trail
  }, [pathname, params.pageId, pages, repositories])

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <React.Fragment key={`${crumb.href ?? "current"}-${index}`}>
              <BreadcrumbItem
                className={last ? "min-w-0" : "hidden shrink-0 md:inline-flex"}
              >
                {crumb.href ? (
                  <BreadcrumbLink
                    className="max-w-40 truncate"
                    render={<Link href={crumb.href} />}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {last ? null : (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
