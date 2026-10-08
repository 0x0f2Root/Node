import { failure, forbidden, sameOrigin } from "@/lib/pages/api-guard"
import { ContentError, saveImage } from "@/lib/pages/content-directory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Stores a pasted or dropped image in data/pages/assets/. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden()
  }
  try {
    const file = (await request.formData()).get("file")
    if (!(file instanceof File)) {
      throw new ContentError("An image file is required.", 400)
    }
    const path = await saveImage(
      file.name,
      new Uint8Array(await file.arrayBuffer())
    )
    return Response.json({ path }, { status: 201 })
  } catch (error) {
    return failure(error)
  }
}
