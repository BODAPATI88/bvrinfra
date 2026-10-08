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
| Type | `type:site` `type:infra` `type:content` `type:ops` `type:security` | What part of the system it touches |
| Priority | `P0` → `P3` | P0 = correctness or trust, first |
| Size | `size:S` (<1 h) `size:M` (1–3 h) `size:L` (more than a session) | Sizing for sprint planning |
| State | `blocked` | Waiting on something outside the ticket; the note says what |

## Who does what

| Role | Does | Never |
|---|---|---|
| **Ravi** | Decides, approves, merges, applies Terraform, owns dashboards and credentials, checks facts | Merges without reading the plan or the preview |
| **Claude** | Writes code and infrastructure changes, opens PRs, keeps docs current | Pushes to `main`, holds production credentials, publishes unchecked AI drafts |
| **Gemini** | Drafts long-form writing from a supplied fact list | Touches the repo; output goes to Ravi |
| **ChatGPT** | Reviews copy and PR text, drafts short posts | Touches the repo; output goes to Ravi |

Only one writer touches the repository: changes from Gemini or ChatGPT reach it through Ravi and then a Claude PR. That single path is what prevents crossed edits.

## Rules

1. **No ticket, no PR.** Every PR description starts with `Closes #N`, which closes the ticket on merge.
2. **One ticket in progress per owner.** Finish or hand off before starting another.
3. **Facts before publishing.** AI-drafted text marks assumptions with `[CHECK]`; nothing with an open `[CHECK]` is merged.
4. **The rack stays honest.** A rack unit changes status in the same PR that ships the work, never ahead of it.
5. **Sprint review, each Monday:** close what's done, move what isn't, size anything new.
