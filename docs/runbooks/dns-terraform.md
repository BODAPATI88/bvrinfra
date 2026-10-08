# Runbook: changing DNS with Terraform

DNS for `bvrinfra.in` is managed in `infra/terraform/` (ADR 0001, D2). The dashboard is read-only by convention: a hand edit is drift, and the next plan will try to undo it.

## How a change flows

1. Edit `local.records` in `infra/terraform/main.tf` on a branch, then open a PR.
2. Two checks run on the PR:
   - **Terraform check** (GitHub Actions): format, init, validate. No credentials involved.
   - **HCP Terraform speculative plan**: the real diff against live DNS. Read it; it is the review.
3. Merge. HCP Terraform queues a plan on `main` that **waits for manual apply**.
4. In HCP Terraform, open `bvrinfra-dns` → Runs, check the plan matches the PR's, then **Confirm & apply**.

## Where things live

| What | Where |
|---|---|
| State | HCP Terraform, org `bvrinfra`, workspace `bvrinfra-dns` |
| Cloudflare token | Workspace env var `CLOUDFLARE_API_TOKEN`, sensitive. Scope: Zone DNS Edit + Zone Read on `bvrinfra.in` only |
| Token expiry | One year from 2026-10-08. Roll it a week before. |

## Other tokens to roll yearly

| Token | Where it's stored | Scope | Expires |
|---|---|---|---|
| GitHub fine-grained PAT for Upptime | `BODAPATI88/status` → Actions secret `GH_PAT` | `status` repo only: Actions, Contents, Issues, Pages, Workflows (read and write) | One year from 2026-10-08 |

## Guardrails

- `prevent_destroy` is set on every record. Removing a record needs a PR that first deletes that guard, so it can't happen by accident.
- Auto-apply is off. Nothing reaches Cloudflare without a human clicking apply.

## Rolling the token

1. Cloudflare → My Profile → API Tokens → the token → **Roll**.
2. HCP Terraform → `bvrinfra-dns` → Variables → delete `CLOUDFLARE_API_TOKEN`, add it again with the new value, tick Sensitive.
3. Start a new plan-only run to confirm it authenticates.

## If a plan wants to change something you didn't touch

Someone (probably you) edited DNS in the dashboard. Either put the change into `main.tf` so code matches reality, or apply the plan to put reality back to code. Never leave it.
