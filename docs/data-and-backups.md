# Data and backups

Node currently uses local project files and browser storage for different kinds of data.

## Project files

- Pages are Markdown files in `data/pages/`. Pasted or dropped images are stored alongside them in `data/pages/assets/`.
- The app writes activity history to `data/activity.json`, tag color choices to `data/tags.json`, and the optional HackTheBox profile cache to `data/htb.json`.

Git tracks the bundled **Getting Started** pages only. Other content under `data/pages/` and the generated JSON files are ignored, so your notes and local activity are not accidentally added to a public commit.

## Browser storage

Tasks, calendar events, editor preferences, page favorites, recent visits, workspace descriptions and icons, and the list of imported repositories are stored in `localStorage`. Imported repository snapshots and custom background images are stored in IndexedDB. This state belongs to the current browser profile and origin; it is not shared across devices and is not part of a Git clone.

## Back up or move your workspace

For Markdown notes, back up or copy `data/pages/`. Keep the generated JSON files too if you want to preserve activity, tag colors, or the HackTheBox cache. Browser data needs a separate export or backup; copying the project folder does not include it. Before moving a workspace to another machine, stop the dev server and copy the files so they are not changing during the copy.

When hosting Node, use a persistent writable volume for project files. Deployments with ephemeral disks can lose pages and generated files when an instance is replaced. Browser-local data remains separate for every browser and device.

## Environment variables

No environment variable is required for the core editor. `HTB_APP_TOKEN` is optional and is only used by the HackTheBox solve feed. Copy `.env.example` to `.env.local` and add your own token there if you use that feature. Never commit `.env.local` or share its contents.
