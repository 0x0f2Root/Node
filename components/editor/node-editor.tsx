"use client"

import {
  MdxEditor,
  useEditorMode,
  type MediaProvider,
} from "@fumadocs-editor/ui"
import * as React from "react"
import { toast } from "sonner"

import { imageSource, saveImage } from "@/lib/pages/store"

// Pasted and dropped images become files in the project's assets folder and
// the document gets a relative link to them. `resolve` turns such a link
// into something the browser can display.
function createMedia(pageId: string): MediaProvider {
  return {
    upload: (file) => saveImage(pageId, file),
    resolve: (src) => imageSource(pageId, src),
    onError(error) {
      toast.error("The image could not be saved", {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  }
}

function Surface() {
  const { mode } = useEditorMode()
  // Both surfaces pad themselves (20px source, 24px visual, where the block
  // handles sit). Pulling each out by its padding lines the text up with the
  // page title.
  if (mode === "source") {
    return (
      <div className="-mx-5">
        <MdxEditor.Source />
      </div>
    )
  }
  return (
    <div className="-mx-6">
      <MdxEditor.Visual />
    </div>
  )
}

/**
 * The document editor. This is the only place the Fumadocs editor is
 * mounted: Node hands it Markdown/MDX source and receives Markdown/MDX back.
 *
 * `source` is read once. The editor is uncontrolled after that, so the
 * current document is never fed back in; remount with a `key` to open a
 * different page.
 *
 * It is composed from the editor's own parts rather than the boxed preset so
 * the document sits directly on the page: the Visual / MDX switch, then one
 * surface. To add Node's own editable MDX components later, pass
 * `components={[...fumadocsUiComponents, ...nodeComponents]}` to the root.
 */
export function NodeEditor({
  pageId,
  source,
  onChange,
}: {
  /** the page as first opened; the store follows it through renames */
  pageId: string
  source: string
  onChange: (source: string) => void
}) {
  const [media] = React.useState(() => createMedia(pageId))

  return (
    <MdxEditor.Root defaultValue={source} onChange={onChange} media={media}>
      <div className="node-editor flex flex-col gap-3">
        <div className="flex justify-end">
          <MdxEditor.Tabs />
        </div>
        <Surface />
      </div>
    </MdxEditor.Root>
  )
}
