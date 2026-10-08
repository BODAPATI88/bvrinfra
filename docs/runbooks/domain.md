# Runbook: bvrinfra.in domain and DNS

## Registration

| Item | Value |
|---|---|
| Domain | `bvrinfra.in` |
| Registrar | GoDaddy |
| Registered | 2026-04-23 |
| Expires | 2029-04-24 |
| Auto-renew | Off. **Turn on, or set a calendar reminder for early 2029.** |
| Transfer lock | On |

## DNS

| Item | Value |
|---|---|
| DNS provider | Cloudflare (free plan) |
| Nameservers | `carlane.ns.cloudflare.com`, `kanye.ns.cloudflare.com` |
| Account access | MFA enabled. Recovery codes stored in a password manager. |
| Managed by | Terraform, `infra/terraform/` (ADR 0001, D2). No dashboard edits; see [dns-terraform.md](dns-terraform.md). |

## Current records (2026-10-08)

| Name | Type | Target | Proxy | Purpose |
|---|---|---|---|---|
| `bvrinfra.in` | CNAME (flattened) | `bvrinfra-5l8.pages.dev` | On | Site, via Pages custom domain |
| `www` | CNAME | `bvrinfra-5l8.pages.dev` | On | Site, via Pages custom domain |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; …` | n/a | Email policy |

The Pages project subdomain is `bvrinfra-5l8.pages.dev`, with a lowercase **L** in `5l8`. `bvrinfra.pages.dev` belongs to an unrelated business; never link to it.

## Change log

- **2026-10-08:** Removed 22 dead records after the September host deletion:
  - 17 CNAMEs pointing at a deleted Cloudflare Tunnel (`4dbafb24…`)
  - 1 tunnel route (`demo`)
  - 1 A record with a private home-network IP (`infra`)
  - 1 A record to the old host (`ats`)
  - 2 records for a discontinued project
  - 1 registrar leftover (`_domainconnect`)
- **2026-10-08:** Deleted tunnel `bvr-vm200-v2` (down, no connectors).
- **2026-10-08:** Site back online. Deleted the apex and `www` A records (dead host `9.205.154.113`), added proxied CNAMEs to `bvrinfra-5l8.pages.dev`, and attached both as Pages custom domains. Both are Active with SSL; verified externally.
- **2026-10-08:** All three records adopted into Terraform (HCP run: 3 imported, 3 changed to add comments, 0 added, 0 destroyed). Site verified up afterwards.

## Rules

- Never publish a private (RFC 1918) IP in public DNS.
- Every admin hostname sits behind Cloudflare Access (ADR 0001, D3).
- Export the zone file before any bulk change.
