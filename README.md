# bvrinfra

Source of truth for [bvrinfra.in](https://bvrinfra.in): the site, the DNS that serves it, and the runbooks that keep it recoverable.

This repo replaces an earlier stack ([`bvrinfra-site`](https://github.com/BODAPATI88/bvrinfra-site), archived) that served a mostly static site from a single Kubernetes host. When that host was deleted in September 2026, the site went with it, along with its backups, which lived on the same machine. The rebuild is designed so that can't happen again. See [ADR 0001](docs/adr/0001-bvrinfra-architecture.md).

## Architecture

```
laptop ──PR──▶ GitHub (this repo, main protected)
                 │
                 ├─ GitHub Actions ─── build check on every PR
                 ├─ Cloudflare Pages ─ builds site/ on merge → bvrinfra.in
                 └─ HCP Terraform ──── Cloudflare DNS (manual apply)

BODAPATI88/status (Upptime)
  GitHub Actions checks bvrinfra.in every 5 min → status.bvrinfra.in

homelab (separate repo: infra-homelab, private while hardened)
  Proxmox host, services on Docker Compose (K3s decommissioned Sep 2026)
  planned: admin access via Cloudflare Access, restic → home HDD + one cloud copy
```

| Layer | Tool | Status |
|---|---|---|
| Site | Astro (static) on Cloudflare Pages | Live |
| CI | GitHub Actions build check | Live |
| DNS as code | Terraform, Cloudflare provider, HCP Terraform state | Live |
| Monitoring | Upptime (GitHub Actions) + status page at status.bvrinfra.in | Live |
| Backups | restic, with a tested restore | Planned |

## Layout

```
site/            Astro site (Cloudflare Pages builds from here)
infra/terraform/ DNS as code (see docs/runbooks/dns-terraform.md)
ansible/         Homelab mirror config (planned)
docs/adr/        Architecture decision records
docs/runbooks/   How to operate and recover each piece
```

## Working on the site

```bash
cd site
npm ci
npm run dev      # http://localhost:4321
npm run build    # output in site/dist
```

## Rules

- `main` is protected: every change lands through a pull request.
- No secrets in this repo. Credentials live in GitHub Actions secrets or the provider's own store.
- AI tools draft changes into PRs; they never hold production credentials (ADR 0001, D7).

## Roadmap

- [x] Phase 1: audit of existing repos, ADR 0001 accepted
- [x] Site live on Cloudflare Pages at bvrinfra.in
- [x] DNS imported into Terraform
- [x] Monitoring and public status page ([status.bvrinfra.in](https://status.bvrinfra.in))
- [ ] Off-site backups with a passed restore test
- [x] [September 2026 post-mortem](https://bvrinfra.in/writing/september-2026-outage/)
- [ ] More write-ups (tracked as issues)
- [x] Security headers, link previews, sitemap
