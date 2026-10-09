# Instructions for AI coding agents

This file is read by AI coding agents (Jules, Codex, Claude Code) working in this repository.
Humans: see [docs/working-agreement.md](docs/working-agreement.md).

## Before you start
1. Work only on a GitHub issue assigned to you by its `owner:` label. If there is no issue, stop.
2. Read the issue's **Done when** list. That is the scope. Do nothing outside it.
3. Check there is no open PR for the same issue.

## Your lane: files you may change

| Agent | Label | May change | Must not change |
|---|---|---|---|
| Jules / Gemini | `owner:gemini` | `site/src/pages/writing/**` (new articles), `site/src/data/log.ts` (one entry per article) | everything else |
| Codex / ChatGPT | `owner:chatgpt` | Text inside existing pages under `site/src/pages/**` when the issue asks for copy edits | layout, styles, components, data files other than the one named in the issue |
| Claude | `owner:claude` | anything, including `infra/**`, `.github/**`, `site/src/components/**` | — |

Nobody but Claude touches `infra/terraform/**`, `.github/**`, `site/public/_headers`, `site/src/data/stack.ts` or this file.
If the issue needs a change outside your lane, say so in the PR and stop.

## Rules
- **Never push to `main`.** Branch as `<agent>/<issue-number>-<short-name>` (for example `jules/21-why-static`) and open a PR.
- **First line of the PR description:** `Closes #<issue>`.
- **Facts:** use only facts given in the issue or already on the site. Mark anything you assumed with `[CHECK]`. A PR with an open `[CHECK]` will not be merged.
- **No secrets, tokens, IP addresses, employer or client names** in any file.
- **Style:** plain English, sentence case, no buzzwords, no exclamation marks. Match the tone of existing pages.
- **Rack honesty:** never change a unit's status in `site/src/data/stack.ts`.

## Report on the ticket
Post an update as a comment on the issue (not only on the PR) at each of these moments:
- **Started:** when you begin work.
- **PR opened:** with the PR link.
- **Blocked:** as soon as you cannot continue, with the exact error and what you need.
- **Done:** when the PR is ready for review.

Use this format, so updates from every agent read the same:
```
<!-- agent-update -->
**Update: <agent>, <status: started | PR opened | blocked | done>**
- Did: <one or two lines>
- Next: <one line>
- Needs from Ravi: <one line, or "nothing">
- PR: <link, or "none">
```
If you cannot comment on GitHub (for example a 403 or no network), end your chat reply with the same block. Ravi pastes it into the issue. Never report work as done unless the build ran and passed.

## Check your work before opening the PR
```bash
cd site
npm ci
npm run build   # must succeed; CI runs the same and is required to merge
```
New article pages go in `site/src/pages/writing/<slug>.astro` and must use the `Base` layout with `type="article"`, like `september-2026-outage.astro`.
