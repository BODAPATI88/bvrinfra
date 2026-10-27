# Runbook: update the tunnel connector (cloudflared)

> **Last run:** 27 Oct 2026, 2024.12.2 → 2026.10.4 (#118). It exposed a cluster DNS fault (#119), fixed the same day. This page is what that run taught.

The connector runs in the cluster (`Deployment/cloudflared`, namespace `site`, on k3s-apps) and dials out to Cloudflare, so nothing at home is exposed. Its manifest is infra-homelab `apps/site/cloudflared.yaml`. It runs **2 replicas** and replaces them one at a time (`maxUnavailable: 0`), so an update never takes the origin down (#120). While the origin is down, the front-door Worker serves the Pages copy.

## When

- Cloudflare supports a cloudflared release for one year after the latest release. Anything older can stop working when Cloudflare changes its side.
- The infra-homelab `cloudflared age` workflow runs on the 1st of each month. It opens one issue there when the pinned version is 3 or more months old (#121). Update then, in small steps.
- Never use `:latest`. The workflow fails on an unpinned image.

## Steps

1. **PR in infra-homelab:** change only the image tag in `apps/site/cloudflared.yaml`. Merge once `validate` is green.
2. **Apply on k3s-server.** It has no checkout of the private repo, so set the image directly. That gives the same result as the merged file:

   ```bash
   sudo k3s kubectl -n site set image deploy/cloudflared cloudflared=cloudflare/cloudflared:<NEW>
   sudo k3s kubectl -n site rollout status deploy/cloudflared --timeout=180s
   ```

3. **Prove it.** "Rolled out" only means Kubernetes is done, not that the tunnel is up:

   ```bash
   sudo k3s kubectl -n site get pods -l app=cloudflared -o wide        # 2 × 1/1 Running, 0 restarts
   for p in $(sudo k3s kubectl -n site get pods -l app=cloudflared -o name); do
     printf "%s  " "$p"; sudo k3s kubectl -n site logs "$p" --tail=-1 | grep -c "Registered tunnel connection"
   done                                                               # 4 per pod
   ```

   Then check Zero Trust → Networks → Tunnels: 2 connectors on the new version.

## Pitfalls seen on 27 Oct

| What you see | What it means |
|---|---|
| `rollout status` says "successfully rolled out", but the image didn't change | Nothing was applied, for example because `apply -k` ran outside a checkout. Check the image with `kubectl get pod … -o jsonpath='{..image}'`. |
| `grep -c` with `logs -l app=cloudflared` prints 0 | With a selector, `kubectl logs` keeps only the last 10 lines per pod. Use one pod at a time with `--tail=-1`. |
| `CrashLoopBackOff`, `lookup region1.v2.argotunnel.com … server misbehaving` | Cluster DNS can't resolve outside names. The connector version isn't the cause, and rolling back won't help. See below. |
| `curl -sI https://bvrinfra.in` returns 200 while the tunnel is down | The Worker is serving the Pages fallback. A 200 doesn't prove the origin works. |

## Cluster DNS (#119)

CoreDNS forwards outside names to the file set by k3s `resolv-conf`: `/etc/rancher/k3s/resolv.conf` on k3s-server, with `8.8.8.8` and `8.8.4.4`. Don't point it at 1.1.1.1. From this network, 1.1.1.1 doesn't answer the plain UDP queries CoreDNS sends. It does answer `dig`, which is why the host itself seemed fine. The setting lives in `/etc/rancher/k3s/config.yaml` and in the Terraform cloud-init (infra-homelab PR #31), so it survives a k3s restart and a rebuild.

Quick check from a pod:

```bash
sudo k3s kubectl run dnstest --rm -i --restart=Never --image=busybox:1.36 -- nslookup region1.v2.argotunnel.com
```

A test pod pinned to k3s-server needs `"tolerations":[{"operator":"Exists"}]`, because that node has the `CriticalAddonsOnly=true:NoExecute` taint.

## Way back

```bash
sudo k3s kubectl -n site set image deploy/cloudflared cloudflared=cloudflare/cloudflared:<OLD>
```

Then revert the PR. If DNS is the problem, rolling back doesn't help: fix DNS first.
