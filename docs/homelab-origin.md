# Serving bvrinfra.in from the homelab, with Pages as the fallback (#101)

```
visitor ─► bvrinfra.in (Cloudflare) ─► Worker "bvrinfra-front-door"
                                          │ 1st: https://origin.bvrinfra.in ─► Cloudflare Tunnel ─► k3s-apps: nginx (this site's image)
                                          │      answered < 2.5 s and not 5xx?  → X-Served-By: homelab
                                          └ else: https://bvrinfra-5l8.pages.dev (same build, Cloudflare Pages) → X-Served-By: pages
```

- **Same content both ways.** Pages builds `main`. The `Site image` workflow builds the same commit into `ghcr.io/bodapati88/bvrinfra:main`.
- **No caching in front.** The Worker asks the homelab on every request, and HTML is sent `no-cache`. Only fingerprinted files under `/_astro/` are cached.
- **Nothing opened at home.** The tunnel's connector (cloudflared) dials out from the cluster; no port is forwarded.
- **No Cloudflare token in GitHub.** The Worker is deployed by hand with `wrangler`. DNS stays in Terraform with a manual apply.

## Parts and where they live

| Part | Repo / file | Who applies |
|---|---|---|
| Container image | `site/Dockerfile`, `site/nginx/` | CI pushes on merge to `main` |
| Worker | `infra/worker/` (tests: `node --test infra/worker/test/index.test.mjs`) | Ravi, `npx wrangler deploy` |
| DNS for `origin.bvrinfra.in` | `infra/terraform/origin.tf`, variable `origin_tunnel_id` | Ravi, HCP Terraform |
| Kubernetes (site, cloudflared, rollout) | infra-homelab `apps/site/` | Ravi, `kubectl apply` |

## First-time setup (Ravi)

1. **Image visibility.** After the first merge, the `Site image` workflow pushes the package. On GitHub, open Packages → `bvrinfra` → Package settings and set it to **Public**, so the cluster can pull it without a token. The site is public anyway.
2. **Create the tunnel** (on the Proxmox host or the laptop, with `cloudflared` installed):
   ```bash
   cloudflared tunnel login                 # browser: pick bvrinfra.in
   cloudflared tunnel create bvrinfra-origin
   ```
   This prints the tunnel ID and writes `~/.cloudflared/<ID>.json`. That file is the tunnel's secret: it goes only into the Kubernetes Secret, never into git.
3. **DNS:** in HCP Terraform, workspace `bvrinfra-dns` → Variables, add `origin_tunnel_id = <ID>` (a Terraform variable, not sensitive). Queue a plan. It must show **1 to add**, `origin.bvrinfra.in`, and nothing else. Apply.
4. **Cluster:** follow infra-homelab `apps/site/README.md`. It creates the Secret from the JSON file, applies the manifests, and checks `curl -sI https://origin.bvrinfra.in/` shows `X-Served-By: homelab`.
5. **Worker:**
   ```bash
   cd infra/worker
   npx wrangler login
   npx wrangler deploy
   ```

## Tests (record the results on #101)

1. **Homelab serving:** `curl -sI https://bvrinfra.in/ | grep -i x-served-by` → `homelab`.
2. **Failover:** on the Proxmox host, `qm shutdown 212`. Within a minute, `curl -sI https://bvrinfra.in/` → `pages`, and the page still loads in a browser. Then `qm start 212` → back to `homelab` within a few minutes.
3. **Monitoring:** the Upptime status page stays green through both.

## Way back

- **Fastest, about 1 minute:** Cloudflare dashboard → Workers → `bvrinfra-front-door` → Settings → Triggers, and remove the `bvrinfra.in/*` route. Visitors go straight to Pages again, as before #101.
- **Full:** `npx wrangler delete` in `infra/worker/`. Then remove `origin_tunnel_id` in HCP. The plan will refuse to destroy, because of `prevent_destroy`; remove the record in a reviewed PR as the comment in `main.tf` says. Last, `kubectl delete -k apps/site/` in infra-homelab.
