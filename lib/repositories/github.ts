import {
  RepositoryError,
  type RemoteRepository,
  type RepositoryProvider,
} from "@/lib/repositories/types"

// Public GitHub repositories, read through the REST API and the raw file
// host. No credentials are sent, so private repositories are out of reach.

const API = "https://api.github.com"
const RAW = "https://raw.githubusercontent.com"
const NAME = /^[A-Za-z0-9_.-]+$/

interface RepositoryResponse {
  name: string
  full_name: string
  description: string | null
  html_url: string
  default_branch: string
  stargazers_count: number
  forks_count: number
  language: string | null
  license: { spdx_id: string | null; name: string } | null
  owner: { login: string }
  size: number
}

interface TreeResponse {
  truncated: boolean
  tree: { path: string; type: "blob" | "tree" | "commit"; size?: number }[]
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/")
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, {
      signal,
      headers: url.startsWith(API)
        ? { Accept: "application/vnd.github+json" }
        : undefined,
    })
  } catch {
    if (signal?.aborted) {
      throw new RepositoryError("cancelled", "The import was cancelled.")
    }
    throw new RepositoryError(
      "network",
      "GitHub could not be reached. Check your connection and try again."
    )
  }
}

async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await request(`${API}${path}`, signal)

  if (response.ok) {
    return (await response.json()) as T
  }
  if (
    response.status === 429 ||
    (response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0")
  ) {
    throw new RepositoryError(
      "rate-limit",
      "GitHub's hourly request limit for this network has been reached. Try again later."
    )
  }
  if (response.status === 404) {
    throw new RepositoryError(
      "not-found",
      "That repository was not found. Private repositories are not supported yet."
    )
  }
  if (response.status === 409) {
    throw new RepositoryError("empty", "That repository is empty.")
  }
  throw new RepositoryError(
    "api",
    "GitHub could not provide that repository. Try again in a moment."
  )
}

export const github: RepositoryProvider = {
  parse(input) {
    const trimmed = input.trim().replace(/\.git$/, "")
    const match =
      trimmed.match(
        /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i
      ) ?? trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
    if (!match) {
      return null
    }
    const [, owner, name] = match
    return NAME.test(owner) && NAME.test(name) ? { owner, name } : null
  },

  async describe(ref, signal): Promise<RemoteRepository> {
    const repository = await api<RepositoryResponse>(
      `/repos/${ref.owner}/${ref.name}`,
      signal
    )
    if (repository.size === 0) {
      throw new RepositoryError("empty", "That repository is empty.")
    }

    // One request for the whole tree. GitHub truncates very large trees;
    // a partial snapshot would silently miss files, so that is refused.
    const tree = await api<TreeResponse>(
      `/repos/${ref.owner}/${ref.name}/git/trees/${encodeURIComponent(
        repository.default_branch
      )}?recursive=1`,
      signal
    )
    if (tree.truncated) {
      throw new RepositoryError(
        "too-large",
        "That repository is too large to import in one snapshot."
      )
    }

    return {
      id: `${repository.owner.login}~${repository.name}`.toLowerCase(),
      provider: "github",
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description ?? undefined,
      htmlUrl: repository.html_url,
      branch: repository.default_branch,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      language: repository.language ?? undefined,
      license:
        repository.license?.spdx_id &&
        repository.license.spdx_id !== "NOASSERTION"
          ? repository.license.spdx_id
          : repository.license?.name,
      entries: tree.tree
        // "commit" entries are submodules: pointers, not content.
        .filter((entry) => entry.type !== "commit")
        .map((entry) => ({
          path: entry.path,
          type: entry.type === "tree" ? "directory" : "file",
          size: entry.size,
        })),
    }
  },

  async fetchFile(source, path, signal) {
    const response = await request(this.rawUrl(source, path), signal)
    if (!response.ok) {
      throw new RepositoryError("api", `${path} could not be downloaded.`)
    }
    return response.arrayBuffer()
  },

  rawUrl(source, path) {
    return `${RAW}/${source.owner}/${source.name}/${encodeURIComponent(
      source.branch
    )}/${encodePath(path)}`
  },

  webUrl(source, path, type) {
    if (!path) {
      return source.htmlUrl
    }
    return `${source.htmlUrl}/${type === "directory" ? "tree" : "blob"}/${encodeURIComponent(
      source.branch
    )}/${encodePath(path)}`
  },
}
