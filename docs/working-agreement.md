# Working agreement

How work on bvrinfra is planned and split between me and the AI tools I use, so two of us never change the same thing at once.

## Board

- **Tickets:** GitHub Issues in this repo. One ticket = one outcome with a "Done when" list.
- **Sprints:** one-week milestones (`Sprint 1 · 8–14 Oct 2026`, …). Unfinished tickets roll to the next sprint on purpose, not by default.
- **Board:** a GitHub Project with columns **Backlog → This sprint → In progress → In review → Done**.

## Labels

| Group | Labels | Meaning |
|---|---|---|
| Owner | `owner:claude` `owner:gemini` `owner:chatgpt` `owner:ravi` | Exactly one *doing* owner. A second owner label means a hand-off (for example, Gemini drafts, Ravi fact-checks). |
| Type | `type:site` `type:infra` `type:content` `type:ops` `type:security` `type:feature` | What part of the system it touches; `type:feature` marks a new capability rather than a fix |
| Priority | `P0` → `P3` | P0 = correctness or trust, first |
| Size | `size:S` (<1 h) `size:M` (1–3 h) `size:L` (more than a session) | Sizing for sprint planning |
| State | `blocked` | Waiting on something outside the ticket; the note says what |

## Who does what

| Role | Does | Never |
|---|---|---|
| **Ravi** | Decides, approves, merges, applies Terraform, owns dashboards and credentials, checks facts | Merges without reading the plan or the preview |
| **Claude** (Claude Code) | Code and infrastructure, CI, design system, Terraform; reviews agent PRs | Pushes to `main`, holds production credentials |
| **Gemini** (Jules) | New articles under `site/src/pages/writing/`, from a supplied fact list | Touches infra, CI, styles, components or the rack data |
| **ChatGPT** (Codex if the plan allows, otherwise chat) | Copy edits named in an issue; PR review comments | Touches layout, infra or data files |

Every agent works in a **lane**, a set of folders it may change, defined in [AGENTS.md](../AGENTS.md). Jules and Codex read that file automatically. Lanes don't overlap, so two agents can work at the same time without conflicting edits.

## Access

- Each agent connects through **its own GitHub app**, installed on **this repository only** (`BODAPATI88/bvrinfra`). Never on `status`, `infra-homelab` or any private repo.
- No agent receives Cloudflare, HCP Terraform or GitHub tokens. Terraform runs only in HCP Terraform, applied by Ravi.
- Agents can open branches and PRs. Only Ravi merges.
- To revoke an agent: GitHub → Settings → Applications → the app → Configure → remove the repository.

## Pipeline: from ticket to merge

| Step | Who | What happens | Board column |
|---|---|---|---|
| 1. Pick | Ravi | Moves a ticket to **This sprint** and sets one `owner:` label | This sprint |
| 2. Start | Agent | Ravi hands the issue link to the agent (Jules: add the `jules` label or paste the link; Codex: paste the link) | In progress |
| 3. PR | Agent | Branch `<agent>/<issue>-<name>`, PR starting `Closes #N` | In review |
| 4. Guard | CI | `build` and `guard` must pass: lane, `Closes #N`, no open `[CHECK]`, no private IPs | In review |
| 5. Review | Claude | Reads the diff against the issue's **Done when** list, posts approve or change requests | In review |
| 6. Merge | Ravi | Merges only when both checks are green **and** Claude's latest review has no open items | Done |

Nothing merges itself. Steps 4 and 5 make step 6 a two-minute decision, not a re-review.

## Assignment policy

Assignment is automatic inside these limits. Change a limit with a PR to this file.

| Rule | How it works | Enforced by |
|---|---|---|
| **Author gate** | Only issues opened by Ravi (BODAPATI88) are eligible. Any other author's issue gets `untrusted` and agents ignore it. | `issue-gate` workflow, no AI |
| **Approval gate** | `P0`, `P1`, `size:L`, `type:infra` and `type:security` tickets get `needs-approval`. They start only after Ravi adds `approved`. | `issue-gate` workflow, no AI |
| **Shape gate** | The issue needs a **Done when** list. Without it the dispatcher asks for one and does not assign. | Dispatcher |
| **Owner by rule** | New article → `owner:gemini`. Wording change in an existing page → `owner:chatgpt`. Code, CI, design → `owner:claude`. Dashboards, credentials, facts → `owner:ravi`. | Dispatcher |
| **Auto-approve band** | Eligible `P2`/`P3`, `size:S`/`size:M`, `type:site`/`type:content` tickets are added to the current sprint and labelled `auto-approved`. | Dispatcher |
| **Never automatic** | Terraform, DNS, secrets, `.github/**`, rack status in `stack.ts`. These are always `owner:claude` or `owner:ravi` with `needs-approval`. | Dispatcher + `guard` |
| **Limits** | One open PR per agent. At most 3 `auto-approved` tickets per agent per sprint. | Dispatcher |

Only people with write access can add the `jules` label that starts Jules. Keep write access to Ravi alone.

## Rules

1. **No ticket, no PR.** Every PR description starts with `Closes #N`, which closes the ticket on merge.
2. **One agent per ticket.** Whoever holds the `owner:` label works it; nobody else opens a PR for it.
3. **Build must pass.** The `build` check is required by the `main` ruleset; a red PR can't merge.
4. **One ticket in progress per owner.** Finish or hand off before starting another.
5. **Facts before publishing.** AI-drafted text marks assumptions with `[CHECK]`; nothing with an open `[CHECK]` is merged.
6. **The rack stays honest.** A rack unit changes status in the same PR that ships the work, never ahead of it.
7. **Sprint review, each Monday:** close what's done, move what isn't, size anything new.
