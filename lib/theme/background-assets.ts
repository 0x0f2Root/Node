// Local asset storage for the workspace background. Images are too large for
// localStorage, so they are kept as Blobs in IndexedDB and never leave the
// browser. This is the "background" store of the shared asset database.

import * as db from "@/lib/storage/asset-db"

const STORE = "background"

export function getAsset<T>(key: string): Promise<T | undefined> {
  return db.getAsset<T>(STORE, key)
}

export function putAsset(key: string, value: unknown): Promise<void> {
  return db.putAsset(STORE, key, value)
}

export function deleteAsset(key: string): Promise<void> {
  return db.deleteAsset(STORE, key)
}
