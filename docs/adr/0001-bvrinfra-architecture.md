# ADR 0001: bvrinfra.in rebuild architecture

**Status:** Accepted, 2026-10-08 (Ravi Kishore). Phase 1 closed; Phase 2 may begin.
**Date:** 2026-10-08
**Evidence:** Phase 1 repo audit, 2026-10-08 (findings summarised in Context below)

## Context

bvrinfra.in went down in September 2026 when its host VM was deleted. The audit found why recovery wasn't possible:

- The site depended on a full K3s cluster (Traefik, ArgoCD, Prometheus) to serve mostly static pages.
- Backups were written to the same machine they protected.
- The restore procedure was never written.
- Admin and inventory endpoints were published without an authentication layer in code.

Constraints: one engineer, about 3–4 hours a day, near-zero budget, and AI tools (Claude Pro, Gemini Pro, ChatGPT Go) with usage caps.

## Decisions

### D1: The public site is static and hosted on Cloudflare Pages
- Astro static site in a new repo, `BODAPATI88/bvrinfra`, deployed by GitHub Actions on merge to `main`.
- **Rejected: serving the site from the homelab K3s cluster again.** That is the design that failed: one host, one blast radius, and uptime tied to home power and ISP.

### D2: DNS is managed in Terraform
- Cloudflare provider; the zone (currently 3 records) is imported into state.
- No manual DNS edits after import; changes go through a pull request.
- Remote state backend: **HCP Terraform, free tier** (hosted state with locking).

### D3: The homelab stays, reusing `infra-homelab`, but nothing admin-facing is public
- Keep the existing K3s / ArgoCD / Traefik / observability stack and its governance and docs.
- Public exposure only through Cloudflare Tunnel, and every admin hostname (ArgoCD, Grafana, Proxmox, platform) sits behind Cloudflare Access, with the policy recorded as code.
- `/api/pods`, `/api/nodes` and `/api/namespaces` stay cluster-internal.
- The homelab mirror of the public site is optional and never a dependency.

### D4: Backups go off-site and restores are tested
- restic replaces `scripts/k3s-backup.sh`, covering etcd/state DB, manifests and Git repos.
- Two copies: a **home external HDD** plus **one cloud copy**. The cloud provider is chosen when D4 is implemented (week 3).
- The HDD copy alone does not count as off-site: it shares the home's power, theft and fire risk. The cloud copy is mandatory, not optional.
- Restore test on a schedule; `docs/recovery-runbook.md` is completed from the first real restore.
- A backup without a passed restore test doesn't count as a backup.

### D5: One container registry, GHCR
- Drop Docker Hub. Revoke its token, and remove the images if nothing else uses them.

### D6: Live metrics come back last
- Reuse the `bvrinfra-site/metrics-api` design (non-root, read-only filesystem, CORS lock, rate limit, sanitised output) as an optional week-4 widget.
- Only after D3 and D4 are in place.

### D7: AI tools work in the build loop only
- Claude, Gemini and ChatGPT draft code, docs and reviews into pull requests.
- No AI tool holds production credentials or runs unattended against live infrastructure.

## Consequences

- The site survives any homelab failure. The homelab becomes a showcase, not a dependency.
- Recovery depends on documents and tested backups, not memory.
- Less "live" spectacle at launch, traded for something that stays up.

## Sign-off decisions (2026-10-08)

1. **Terraform state:** HCP Terraform free tier.
2. **Public contact address:** `bodapatigroups@gmail.com`.
3. **`bvrinfra-site` history:** archive as-is, no history rewrite. Residual risk of the published login email and phone number is accepted.
4. **Backups:** home external HDD plus one cloud copy; cloud provider chosen in week 3.
