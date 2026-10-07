import { EditorShell } from "@/components/editor/editor-shell"

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const { pageId } = await params

  return <EditorShell pageId={pageId} />
}
