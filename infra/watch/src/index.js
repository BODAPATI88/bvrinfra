// bvrinfra watch (#109): checks https://bvrinfra.in/ every 15 minutes from Cloudflare, off my hardware.
//
// Quiet by design (Ravi, 18 Oct: no noise):
// - one request per run (about 96 a day);
// - one failed check is not an alert; FAILS_FOR_DOWN failures in a row (default 2, so 30 minutes) is "down";
// - email only on a change of state: one when the site goes down, one when it comes back;
// - a page served by the Pages fallback counts as up, because visitors get the site. It is only recorded.
// State lives in KV and is written only when it changes.

const KEY = "state";

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
};

export async function run(env, now = new Date()) {
  const result = await check(env);
  const before = (await env.STATE.get(KEY, "json")) ?? { status: "up", fails: 0, since: now.toISOString(), servedBy: null };
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
    const after = { status: "up", fails: 0, since: before.status === "up" ? before.since : at, servedBy: result.servedBy };
    const alert = before.status === "down"
      ? { subject: "bvrinfra.in is back up", body: `bvrinfra.in answered ${result.code} at ${at} (served by: ${result.servedBy ?? "unknown"}). It was down since ${before.since}.` }
      : null;
    return { after, alert };
  }
  const fails = before.fails + 1;
  if (before.status === "down") return { after: { ...before, fails }, alert: null };
  if (fails < failsForDown) return { after: { ...before, fails }, alert: null };
  const why = result.error ?? `HTTP ${result.code}`;
  return {
    after: { status: "down", fails, since: at, servedBy: null },
    alert: { subject: "bvrinfra.in is down", body: `bvrinfra.in failed ${fails} checks in a row, 15 minutes apart. Last result at ${at}: ${why}.` },
  };
}

async function send(env, alert) {
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
}
