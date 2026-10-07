"use client"

import {
  MdxEditor,
  useEditorMode,
  type MediaProvider,
} from "@fumadocs-editor/ui"
import { toast } from "sonner"

import { imageStorage } from "@/lib/storage/image-storage"

// Pasted and dropped images go through Node's ImageStorage; the editor only
// ever sees the returned src.
const media: MediaProvider = {
  upload: (file) => imageStorage.upload(file),
  onError(error) {
    toast.error("Image upload failed", {
      description: error instanceof Error ? error.message : undefined,
    })
  },
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
  source,
  onChange,
}: {
  source: string
  onChange: (source: string) => void
}) {
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
