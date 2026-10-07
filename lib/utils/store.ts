export type Listener = () => void

export interface Store<T> {
  get(): T
  set(next: T | ((previous: T) => T)): void
  subscribe(listener: Listener): () => void
}

// A minimal external store, shaped for `useSyncExternalStore`.
export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<Listener>()

  return {
    get: () => value,
    set(next) {
      const resolved =
        typeof next === "function" ? (next as (previous: T) => T)(value) : next
      if (Object.is(resolved, value)) {
        return
      }
      value = resolved
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export interface PersistentStore<T> extends Store<T> {
  /** The value rendered on the server and during hydration. */
  getServer(): T
}

// A store mirrored to localStorage. It reads lazily on the client, so the
// server render and the hydration pass both see `fallback`.
export function createPersistentStore<T>(
  key: string,
  fallback: T
): PersistentStore<T> {
  const store = createStore<T>(fallback)
  let loaded = false

  function load() {
    if (loaded || typeof window === "undefined") {
      return
    }
    loaded = true
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        store.set(JSON.parse(raw) as T)
      }
    } catch {
      // Unreadable or blocked storage: keep the fallback.
    }
  }

  return {
    get() {
      load()
      return store.get()
    },
    set(next) {
      load()
      store.set(next)
      try {
        window.localStorage.setItem(key, JSON.stringify(store.get()))
      } catch {
        // The in-memory value still applies for this session.
      }
    },
    subscribe: store.subscribe,
    getServer: () => fallback,
  }
}
