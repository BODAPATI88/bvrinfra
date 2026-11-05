# Watch Worker: a second outside monitor (#109)

Upptime is scheduled every 5 minutes, but GitHub runs it every few hours (#107). The watch Worker checks `https://bvrinfra.in/` every 15 minutes from Cloudflare, on time, off my hardware.

## What it does

- One request per run, about 96 a day.
- **Up:** any 2xx or 3xx within 10 seconds. A page served by the Pages fallback (`X-Served-By: pages`) is up, because visitors get the site. It is only recorded.
- **Down:** 2 failed checks in a row (30 minutes). One failure alone is not an alert.
- **Email only on a change:** one "is down" email, then nothing until one "is back up" email.
- State is kept in KV (`WATCH_STATE`) and written only when it changes.
- Every run logs one JSON line (`check`, `status`, `fails`, `alert`), visible under the Worker's **Logs** in the dashboard.

| Part | File | Who applies |
|---|---|---|
| Worker code | `infra/watch/src/index.js` (tests: `node --test infra/watch/test/index.test.mjs`) | Ravi, `npx wrangler deploy` |
| Schedule, KV, email binding | `infra/watch/wrangler.toml` | Ravi |
| Recipient address | Worker secret `ALERT_TO`, never in git | Ravi |

## First-time setup (Ravi)

From `infra/watch/`, logged in with `npx wrangler login`:

1. Create the state store and paste the printed `id` into `wrangler.toml` in place of `PASTE_KV_NAMESPACE_ID`:
   ```bash
   npx wrangler kv namespace create WATCH_STATE
   ```
2. Check that the address alerts should go to is a **verified destination** under Cloudflare dashboard → bvrinfra.in → Email → Email Routing → Destination addresses. The Gmail address from #19 already is.
3. Deploy, then set the recipient. Paste the address at the prompt; it isn't stored in git:
   ```bash
   npx wrangler deploy
   npx wrangler secret put ALERT_TO
   ```
4. In the dashboard, open Workers & Pages → `bvrinfra-watch` → Settings → Triggers and confirm the cron `*/15 * * * *`.
5. After the next quarter hour, open **Logs** and check that the line reads `"status":"up"` and shows `servedBy`.

## Test (Done-when item 4)

1. Point the Worker at a page that doesn't exist. A 404 counts as a failed check:
   ```bash
   npx wrangler deploy --var TARGET:https://bvrinfra.in/watch-test-404
   ```
2. Wait 30 minutes (2 runs). Expect **one** email, "bvrinfra.in is down", and no second one after the third run.
3. Deploy again without the override, so `TARGET` is `https://bvrinfra.in/` again:
   ```bash
   npx wrangler deploy
   ```
   After the next run, expect **one** email, "bvrinfra.in is back up".
4. Comment both email times on #109.

## Way back

`npx wrangler delete` from `infra/watch/`, then delete the `WATCH_STATE` namespace. Nothing else depends on it.
