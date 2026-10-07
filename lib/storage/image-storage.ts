export interface ImageStorage {
  /** Stores the file and returns the src the document will reference. */
  upload(file: File): Promise<string>
}

const MAX_INLINE_BYTES = 1024 * 1024

/**
 * Local provider: inlines the image as a data URL, so it travels with the
 * Markdown source and needs no server. Replace with an uploader that returns
 * a hosted URL when real storage exists.
 */
export class InlineImageStorage implements ImageStorage {
  upload(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      return Promise.reject(new Error(`${file.name} is not an image.`))
    }
    if (file.size > MAX_INLINE_BYTES) {
      return Promise.reject(
        new Error(`${file.name} is larger than 1 MB. Add it by URL instead.`)
      )
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
      reader.readAsDataURL(file)
    })
  }
}

export const imageStorage: ImageStorage = new InlineImageStorage()
