// Browser-local storage for things too large for localStorage: background
// images and imported repository snapshots. One IndexedDB database, one
// object store per feature, string keys. Nothing here leaves the browser.

const DATABASE = "node-assets"
// Version 3 briefly added a third store; the number stays so browsers that
// already opened it are not asked to go backwards.
const VERSION = 3

export type AssetStore = "background" | "repositories"

const STORES: AssetStore[] = ["background", "repositories"]

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      for (const store of STORES) {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store)
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Runs `work` in one transaction and resolves once it has committed. */
async function transact<T>(
  store: AssetStore,
  mode: IDBTransactionMode,
  work: (objectStore: IDBObjectStore) => (() => T) | void
): Promise<T | undefined> {
  const database = await open()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(store, mode)
      const read = work(transaction.objectStore(store))
      transaction.oncomplete = () => resolve(read ? read() : undefined)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

function prefixRange(prefix: string) {
  return IDBKeyRange.bound(prefix, `${prefix}￿`)
}

export function getAsset<T>(
  store: AssetStore,
  key: string
): Promise<T | undefined> {
  return transact<T | undefined>(store, "readonly", (objectStore) => {
    const request = objectStore.get(key)
    return () => request.result as T | undefined
  })
}

export async function putAsset(
  store: AssetStore,
  key: string,
  value: unknown
): Promise<void> {
  await transact(store, "readwrite", (objectStore) => {
    objectStore.put(value, key)
  })
}

/** Writes many records in a single transaction. */
export async function putAssets(
  store: AssetStore,
  entries: readonly (readonly [string, unknown])[]
): Promise<void> {
  await transact(store, "readwrite", (objectStore) => {
    for (const [key, value] of entries) {
      objectStore.put(value, key)
    }
  })
}

export async function deleteAsset(
  store: AssetStore,
  key: string
): Promise<void> {
  await transact(store, "readwrite", (objectStore) => {
    objectStore.delete(key)
  })
}

export async function deleteAssetsByPrefix(
  store: AssetStore,
  prefix: string
): Promise<void> {
  await transact(store, "readwrite", (objectStore) => {
    objectStore.delete(prefixRange(prefix))
  })
}

/** Every record whose key starts with `prefix`, as [key, value] pairs. */
export async function getAssetsByPrefix<T>(
  store: AssetStore,
  prefix: string
): Promise<[string, T][]> {
  const result = await transact<[string, T][]>(
    store,
    "readonly",
    (objectStore) => {
      const keys = objectStore.getAllKeys(prefixRange(prefix))
      const values = objectStore.getAll(prefixRange(prefix))
      return () =>
        keys.result.map((key, index): [string, T] => [
          String(key),
          values.result[index] as T,
        ])
    }
  )
  return result ?? []
}
