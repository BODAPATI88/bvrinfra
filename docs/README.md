# Docs

Everything needed to understand and run bvrinfra.in and the homelab behind it, without the chat history. Facts here come from this repo, its issues and `BODAPATI88/infra-homelab`. Anything not yet confirmed is marked `[CHECK]`.

- **Playbooks** say what to do when something happens. Open one when an alert arrives.
- **Runbooks** say how to do one job, step by step.

## First day: read in this order

1. [overview.md](overview.md): what runs where, who owns what, where each secret lives. About 10 minutes.
2. [working-agreement.md](working-agreement.md) and [AGENTS.md](../AGENTS.md): how work is split between Ravi and the AI agents, and the Merge standard.
3. [runbooks/ticket-to-merge.md](runbooks/ticket-to-merge.md): how an issue becomes a merged PR.
4. [adr/0001-bvrinfra-architecture.md](adr/0001-bvrinfra-architecture.md): why the site is built this way, after the September 2026 outage.
5. [homelab-origin.md](homelab-origin.md): the homelab origin with the Pages fallback.
6. [runbooks/site-deploy.md](runbooks/site-deploy.md): what a merge does, and how to see which version is live.
7. Skim the five playbooks, so you know they exist before you need one.
8. infra-homelab `docs/homelab-build.md`: how the VMs, backups, monitoring and access are built.

Then, on day one, run the read-only checks: `curl -sI https://bvrinfra.in/ | grep -i x-served-by`, and if you have cluster access, the health check in [runbooks/monitoring-stack.md](runbooks/monitoring-stack.md).

## Playbooks: when something happens

| Playbook | Use it when |
|---|---|
| [playbooks/site-down.md](playbooks/site-down.md) | bvrinfra.in doesn't load, or a monitor says it is down |
| [playbooks/homelab-down-or-power-cut.md](playbooks/homelab-down-or-power-cut.md) | The site is served by Pages, a node is down, the heartbeat stopped, or the power went off |
| [playbooks/secret-exposed.md](playbooks/secret-exposed.md) | A token, password or key was seen where it shouldn't be |
| [playbooks/bad-deploy-or-merge.md](playbooks/bad-deploy-or-merge.md) | A merge, a DNS plan or a Worker deploy broke something |
| [playbooks/monitor-alert.md](playbooks/monitor-alert.md) | Any alert arrived and you need to know what it means |

## Runbooks: how to do a job

| Runbook | What it covers |
|---|---|
| [runbooks/ticket-to-merge.md](runbooks/ticket-to-merge.md) | Agents, lanes, branch names, `Closes`/`Refs`, checks, review, Merge standard |
| [runbooks/site-deploy.md](runbooks/site-deploy.md) | Merge to Pages and the GHCR image, the rollout CronJob, which version is live |
| [runbooks/dns-terraform.md](runbooks/dns-terraform.md) | Changing DNS through Terraform and HCP; rolling tokens; the rotation log |
| [runbooks/domain.md](runbooks/domain.md) | The domain registration, nameservers and records |
| [homelab-origin.md](homelab-origin.md) | Setting up the homelab origin, the tunnel and the front-door Worker; the way back |
| [runbooks/failover-test.md](runbooks/failover-test.md) | The failover test with Upptime run by hand (18 Oct procedure) |
| [runbooks/monitoring-stack.md](runbooks/monitoring-stack.md) | Health check of Prometheus, Grafana and Alertmanager; Grafana by port-forward; alert tests |
| [runbooks/backups-and-restore.md](runbooks/backups-and-restore.md) | What is backed up, how to check it, the restore drill (partly unproven) |
| [runbooks/k3s-token-rotation.md](runbooks/k3s-token-rotation.md) | Rotating the K3s join token without printing it (not run yet) |
| [runbooks/watch-worker.md](runbooks/watch-worker.md) | The 15-minute outside monitor: setup, test, way back |
| [runbooks/upptime.md](runbooks/upptime.md) | Upptime and the status page; running it by hand; the real interval |
| [runbooks/cloudflared-update.md](runbooks/cloudflared-update.md) | Updating the tunnel connector, proving it worked, the cluster DNS pitfall, the way back |

## Decisions

| Record | What |
|---|---|
| [adr/0001-bvrinfra-architecture.md](adr/0001-bvrinfra-architecture.md) | The rebuild after September 2026: static site, DNS in Terraform, no public admin, off-site backups, GHCR, AI tools in the build loop only |

Since the ADR, the site is also served from the homelab, with Pages as the fallback (#101, 17 Oct 2026). The ADR's rule still holds: the site must not depend on the homelab.

## In infra-homelab

| Doc | What |
|---|---|
| `docs/homelab-build.md` | The current build: VMs, backups, R2, monitoring, alerts, heartbeat, memory reserve, capacity test, access model, phone access |
| `apps/site/README.md` | The site, cloudflared and the rollout CronJob on k3s-apps |
| `scripts/proxmox/` | `backup-job.sh`, `offsite-r2.sh`, `r2-restore-drill.sh`, `capacity-test.sh`, `exposure-audit.sh` |

`docs/recovery-runbook.md` in infra-homelab describes the old cluster and is not current. `[CHECK: Ravi to decide whether to delete it or point it at this repo.]`

## Keeping these docs true

- Change a doc in the same PR that changes what it describes.
- Write dates in full (18 October 2026, or 2026-10-18) and times with their zone (UTC or IST).
- No IP addresses, secret values, tunnel IDs, account IDs, email addresses, employer or client names, or costs. The `guard` check rejects private IPs in `docs/`.
- Diagrams are Mermaid code blocks, which GitHub renders.
