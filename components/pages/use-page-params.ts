"use client"

import { useParams } from "next/navigation"

import { resolvePageId } from "@/lib/pages/store"

/**
 * The route's params with `pageId` as the page is called now. A page's id is
 * its path, so right after a rename the URL may still carry the old one.
 */
export function usePageParams<
  T extends { pageId?: string } = { pageId?: string },
>(): T {
  const params = useParams<T>()
  return params.pageId
    ? { ...params, pageId: resolvePageId(params.pageId) }
    : params
}
