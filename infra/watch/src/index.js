// bvrinfra watch (#109): checks https://bvrinfra.in/ every 15 minutes from Cloudflare, off my hardware.
//
// Dual-layer monitoring & instant paging:
// - Edge Availability: Ensures public visitors can reach https://bvrinfra.in/
// - Origin Awareness: Detects when the site fails over to Cloudflare Pages (homelab offline)
// - Instant Multi-Channel Alerts: Cloudflare Email Routing + Webhook (Telegram / Discord / Slack / Pushover)
// State lives in KV and is written only when it changes.

const KEY = "state";

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
};

export async function run(env, now = new Date()) {
  const result = await check(env);
  const before = (await env.STATE.get(KEY, "json")) ?? {
    status: "up",
    fails: 0,
    originFails: 0,
    since: now.toISOString(),
    servedBy: null,
  };
  const { after, alert } = next(before, result, Number(env.FAILS_FOR_DOWN || 2), now);
  if (JSON.stringify(after) !== JSON.stringify(before)) await env.STATE.put(KEY, JSON.stringify(after));
  if (alert) await send(env, alert);
  console.log(JSON.stringify({ check: result, status: after.status, fails: after.fails, alert: alert?.subject ?? null }));
  return { result, after, alert };
}

export async function check(env) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(env.TIMEOUT_MS || 10000));
  try {
    const res = await fetch(env.TARGET, {
      method: "GET",
      headers: { "user-agent": "bvrinfra-watch (+https://github.com/BODAPATI88/bvrinfra/issues/109)" },
      redirect: "follow",
      signal: controller.signal,
      cf: { cacheTtl: -1 },
    });
    await res.body?.cancel();
    return { ok: res.status >= 200 && res.status < 400, code: res.status, servedBy: res.headers.get("X-Served-By") };
  } catch (err) {
    return { ok: false, code: null, servedBy: null, error: err?.name === "AbortError" ? "timeout" : String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

// Pure state machine, so the rules can be tested without Cloudflare.
export function next(before, result, failsForDown, now) {
  const at = now.toISOString();
  if (result.ok) {
    // If it was served by pages, homelab origin is failing over
    if (result.servedBy === "pages") {
      const originFails = (before.originFails || 0) + 1;
      if (before.status === "degraded") {
        return { after: { ...before, originFails, servedBy: "pages" }, alert: null };
      }
      if (originFails >= failsForDown) {
        return {
          after: { status: "degraded", fails: 0, originFails, since: at, servedBy: "pages" },
          alert: {
            subject: "⚠️ Homelab Silicon Offline: Cloudflare Pages Failover Active",
            body: `bvrinfra.in is currently being served by Cloudflare Pages edge mirror (homelab origin unreachable for ${originFails} consecutive checks). Visitors still see the static site, but autonomous AI workers and telemetry are offline.`,
          },
        };
      }
      return { after: { ...before, originFails, servedBy: "pages" }, alert: null };
    }

    // Served by homelab
    const wasDegraded = before.status === "degraded";
    const wasDown = before.status === "down";
    const after = {
      status: "up",
      fails: 0,
      originFails: 0,
      since: (wasDegraded || wasDown) ? at : (before.since || at),
      servedBy: result.servedBy,
    };
    let alert = null;
    if (wasDegraded) {
      alert = {
        subject: "🟢 Homelab Silicon Restored: Traffic back on private silicon",
        body: `bvrinfra.in is once again answering directly from the homelab origin silicon (recovered at ${at}).`,
      };
    } else if (wasDown) {
      alert = {
        subject: "🟢 bvrinfra.in is back up",
        body: `bvrinfra.in answered ${result.code} at ${at} (served by: ${result.servedBy ?? "unknown"}). It was down since ${before.since}.`,
      };
    }
    return { after, alert };
  }

  // Result not ok (total edge outage)
  const fails = before.fails + 1;
  if (before.status === "down") return { after: { ...before, fails }, alert: null };
  if (fails < failsForDown) return { after: { ...before, fails }, alert: null };
  const why = result.error ?? `HTTP ${result.code}`;
  return {
    after: { status: "down", fails, originFails: before.originFails || 0, since: at, servedBy: null },
    alert: {
      subject: "🚨 bvrinfra.in is down",
      body: `bvrinfra.in failed ${fails} checks in a row, 15 minutes apart. Last result at ${at}: ${why}.`,
    },
  };
}

async function send(env, alert) {
  // 1. Send via Cloudflare Email if configured
  if (env.MAIL && env.ALERT_TO && env.FROM) {
    try {
      const raw = [
        `From: bvrinfra watch <${env.FROM}>`,
        `To: ${env.ALERT_TO}`,
        `Subject: ${alert.subject}`,
        `Message-ID: <${crypto.randomUUID()}@bvrinfra.in>`,
        `Date: ${new Date().toUTCString()}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "",
        alert.body,
        "",
      ].join("\r\n");
      const EmailMessage = env.EmailMessage ?? (await import("cloudflare:email")).EmailMessage;
      await env.MAIL.send(new EmailMessage(env.FROM, env.ALERT_TO, raw));
    } catch (e) {
      console.error("Email send failed:", e);
    }
  }

  // 2. Send via Webhook (Telegram, Discord, Slack, Pushover, PagerDuty)
  if (env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(env.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${alert.subject}\n\n${alert.body}`,
          content: `${alert.subject}\n\n${alert.body}`,
          subject: alert.subject,
          body: alert.body,
        }),
      });
    } catch (e) {
      console.error("Webhook send failed:", e);
    }
  }
}
