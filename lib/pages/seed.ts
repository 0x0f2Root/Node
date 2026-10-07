import type { Page } from "@/lib/pages/types"

const WELCOME = `# Welcome to Node

Node is a modern Markdown-first workspace for thinking, writing and organizing knowledge.

## Getting started

Start writing directly in the editor.

You can use Markdown syntax naturally.

## Features

- Markdown-first editing
- MDX support
- Nested pages
- Global search
- Command palette
- Dark mode

## Code

\`\`\`ts
const node = "knowledge";
\`\`\`

> Node is your space for thinking, writing and organizing knowledge.
`

const GETTING_STARTED = `Everything in Node is a page, and every page is plain Markdown.

## The basics

1. Press **Ctrl/⌘ K** to open the command palette.
2. Create a page from the sidebar, or nest one under any existing page.
3. Type \`/\` in the editor to insert headings, tables, code and components.

<Callout title="Your writing stays portable">
  Pages are stored as Markdown/MDX source. Export any page as \`.md\` or \`.mdx\` from its menu.
</Callout>

## A first checklist

- [x] Open the workspace
- [ ] Rename this page
- [ ] Add a child page
- [ ] Star a page to pin it under Favorites
`

const ENGINEERING = `Notes and references for how the system is built and run.

| Area | Page | Owner |
| --- | --- | --- |
| System design | Architecture | Platform |
| Public interface | API Documentation | Platform |
| Releases | Deployment | Infrastructure |
`

const ARCHITECTURE = `The system architecture uses a small set of services behind a single gateway.

## Overview

Requests enter through the gateway, which authenticates the caller and routes to the owning service. Each service owns its data and publishes changes as events.

## Principles

- **One owner per table.** Other services read through the API or the event stream.
- **Stateless by default.** Anything that must survive a restart lives in the database or the queue.
- **Markdown as the document format.** Editors come and go; the source stays readable.

## Request flow

\`\`\`ts
export async function handle(request: Request) {
  const session = await authenticate(request)
  const route = resolve(request.url)
  return route.service.call(session, request)
}
\`\`\`

## Open questions

- [ ] Do we need a read replica for search?
- [ ] Where should rate limiting live: gateway or service?
`

const API_DOCS = `The API is JSON over HTTPS. All endpoints are versioned under \`/v1\`.

## Authentication

Send a bearer token with every request.

\`\`\`bash
curl https://api.example.com/v1/pages \\
  -H "Authorization: Bearer $NODE_TOKEN"
\`\`\`

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | \`/v1/pages\` | List pages |
| POST | \`/v1/pages\` | Create a page |
| PATCH | \`/v1/pages/:id\` | Update title or content |
| DELETE | \`/v1/pages/:id\` | Delete a page |

## Errors

Errors return a JSON body with a stable \`code\` and a human-readable \`message\`.

\`\`\`json
{ "code": "page_not_found", "message": "No page with that id." }
\`\`\`
`

const DEPLOYMENT = `Releases go out from \`main\` after the checks pass.

## Checklist

1. Merge the release pull request.
2. Wait for the build to finish.
3. Promote the build to production.
4. Watch error rates for fifteen minutes.

## Rollback

\`\`\`bash
node-cli release rollback --to previous
\`\`\`

Rolling back never touches the database. Migrations are forward-only and must stay compatible with the previous release.
`

const RESEARCH = `Reading, experiments and half-formed ideas. Nothing here needs to be finished.
`

const NOTES = `## Local-first software

The interesting property is not offline support, it is that the file outlives the application.

- Plain text formats age well.
- Sync is a feature; ownership is the product.

## Editors

A good editor disappears. The measure is how long you can write before you think about the tool.
`

const REFERENCES = `## Reading list

- [CommonMark specification](https://spec.commonmark.org/)
- [MDX documentation](https://mdxjs.com/)
- [Local-first software](https://www.inkandswitch.com/local-first/)

## Glossary

| Term | Meaning |
| --- | --- |
| MDX | Markdown that can contain components |
| Frontmatter | Metadata at the top of a document |
`

const PERSONAL = ``

interface SeedPage {
  id: string
  parentId: string | null
  title: string
  content: string
  favorite?: boolean
  /** minutes before "now" that the page was last updated */
  age: number
}

const SEED: SeedPage[] = [
  {
    id: "welcome",
    parentId: null,
    title: "Welcome to Node",
    content: WELCOME,
    favorite: true,
    age: 2,
  },
  {
    id: "getting-started",
    parentId: null,
    title: "Getting Started",
    content: GETTING_STARTED,
    age: 45,
  },
  {
    id: "engineering",
    parentId: null,
    title: "Engineering",
    content: ENGINEERING,
    age: 60 * 26,
  },
  {
    id: "architecture",
    parentId: "engineering",
    title: "Architecture",
    content: ARCHITECTURE,
    favorite: true,
    age: 60 * 3,
  },
  {
    id: "api-documentation",
    parentId: "engineering",
    title: "API Documentation",
    content: API_DOCS,
    age: 60 * 28,
  },
  {
    id: "deployment",
    parentId: "engineering",
    title: "Deployment",
    content: DEPLOYMENT,
    age: 60 * 24 * 4,
  },
  {
    id: "research",
    parentId: null,
    title: "Research",
    content: RESEARCH,
    age: 60 * 24 * 6,
  },
  {
    id: "notes",
    parentId: "research",
    title: "Notes",
    content: NOTES,
    age: 60 * 24 * 2,
  },
  {
    id: "references",
    parentId: "research",
    title: "References",
    content: REFERENCES,
    age: 60 * 24 * 9,
  },
  {
    id: "personal",
    parentId: null,
    title: "Personal",
    content: PERSONAL,
    age: 60 * 24 * 12,
  },
]

/** The workspace a new browser starts with. */
export function createSeedPages(): Page[] {
  const now = Date.now()

  return SEED.map((seed, index) => ({
    id: seed.id,
    parentId: seed.parentId,
    // Written as nestable pages; the repository organises them into a
    // workspace with folders, the same way it migrates older data.
    kind: "page" as const,
    title: seed.title,
    icon: null,
    content: seed.content,
    favorite: seed.favorite ?? false,
    // Creation order is the sidebar order.
    createdAt: new Date(now - (60 * 24 * 14 - index) * 60_000),
    updatedAt: new Date(now - seed.age * 60_000),
  }))
}
