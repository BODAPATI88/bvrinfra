// node --test infra/watch/test — checks the alert rules without Cloudflare.
import { test } from "node:test";
import assert from "node:assert/strict";
import { run, next } from "../src/index.js";

const t = (m) => new Date(Date.UTC(2026, 9, 18, 16, m));

function env({ responses, state = null, webhookUrl = null }) {
  const store = new Map(state ? [["state", JSON.stringify(state)]] : []);
  const sent = [];
  const webhookCalls = [];
  let i = 0;
  globalThis.fetch = async (url, opts) => {
    if (webhookUrl && url === webhookUrl) {
      webhookCalls.push({ url, body: JSON.parse(opts.body) });
      return new Response("ok", { status: 200 });
    }
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    return new Response("ok", { status: r.status, headers: r.servedBy ? { "X-Served-By": r.servedBy } : {} });
  };
  return {
    TARGET: "https://bvrinfra.in/",
    FROM: "watch@bvrinfra.in",
    ALERT_TO: "me@example.test",
    ALERT_WEBHOOK_URL: webhookUrl,
    TIMEOUT_MS: "50",
    FAILS_FOR_DOWN: "2",
    STATE: {
      writes: 0,
      async get(k, type) {
        const v = store.get(k);
        return v == null ? null : type === "json" ? JSON.parse(v) : v;
      },
      async put(k, v) {
        this.writes++;
        store.set(k, v);
      },
    },
    MAIL: {
      async send(m) {
        sent.push(m);
      },
    },
    EmailMessage: class {
      constructor(from, to, raw) {
        Object.assign(this, { from, to, raw });
      }
    },
    sent,
    webhookCalls,
  };
}

test("up and unchanged: no alert, no KV write after the first run", async () => {
  const e = env({ responses: [{ status: 200, servedBy: "homelab" }] });
  await run(e, t(0));
  const writes = e.STATE.writes;
  await run(e, t(15));
  await run(e, t(30));
  assert.equal(e.sent.length, 0);
  assert.equal(e.STATE.writes, writes);
});

test("one Pages fallback is not an alert", async () => {
  const e = env({ responses: [{ status: 200, servedBy: "pages" }] });
  const { after } = await run(e, t(0));
  assert.equal(after.originFails, 1);
  assert.equal(e.sent.length, 0);
});

test("two Pages fallbacks in a row: alerts homelab offline", async () => {
  const e = env({ responses: [{ status: 200, servedBy: "pages" }, { status: 200, servedBy: "pages" }] });
  await run(e, t(0));
  const { after, alert } = await run(e, t(15));
  assert.equal(after.status, "degraded");
  assert.equal(after.servedBy, "pages");
  assert.equal(e.sent.length, 1);
  assert.match(e.sent[0].raw, /Subject: ⚠️ Homelab Silicon Offline/);
  assert.match(alert.body, /Cloudflare Pages edge mirror/);
});

test("recovery from Pages fallback to homelab: alerts homelab restored", async () => {
  const e = env({
    responses: [{ status: 200, servedBy: "homelab" }],
    state: { status: "degraded", fails: 0, originFails: 2, since: t(0).toISOString(), servedBy: "pages" },
  });
  const { after, alert } = await run(e, t(30));
  assert.equal(after.status, "up");
  assert.equal(after.servedBy, "homelab");
  assert.equal(e.sent.length, 1);
  assert.match(e.sent[0].raw, /Subject: 🟢 Homelab Silicon Restored/);
  assert.match(alert.body, /answering directly from the homelab origin/);
});

test("one failed check is not an alert", async () => {
  const e = env({ responses: [{ status: 503 }, { status: 200, servedBy: "homelab" }] });
  await run(e, t(0));
  await run(e, t(15));
  assert.equal(e.sent.length, 0);
});

test("two failures in a row: one down email, then silence while down", async () => {
  const e = env({ responses: [{ status: 502 }, new TypeError("connect failed"), { status: 502 }, { status: 502 }] });
  await run(e, t(0));
  await run(e, t(15));
  await run(e, t(30));
  await run(e, t(45));
  assert.equal(e.sent.length, 1);
  assert.match(e.sent[0].raw, /Subject: 🚨 bvrinfra.in is down/);
  assert.match(e.sent[0].raw, /connect failed/);
  assert.equal(e.sent[0].to, "me@example.test");
});

test("recovery after down: one back-up email", async () => {
  const e = env({
    responses: [{ status: 200, servedBy: "homelab" }],
    state: { status: "down", fails: 3, since: t(0).toISOString(), servedBy: null },
  });
  const { after } = await run(e, t(45));
  assert.equal(after.status, "up");
  assert.equal(e.sent.length, 1);
  assert.match(e.sent[0].raw, /Subject: 🟢 bvrinfra.in is back up/);
  assert.match(e.sent[0].raw, /down since 2026-10-18T16:00/);
});

test("timeout counts as a failure", async () => {
  const before = { status: "up", fails: 1, originFails: 0, since: t(0).toISOString(), servedBy: "homelab" };
  const { after, alert } = next(before, { ok: false, code: null, error: "timeout" }, 2, t(15));
  assert.equal(after.status, "down");
  assert.match(alert.body, /timeout/);
});

test("webhook notification is dispatched on alert", async () => {
  const webhookUrl = "https://api.telegram.org/bot123/sendMessage";
  const e = env({
    responses: [{ status: 200, servedBy: "pages" }, { status: 200, servedBy: "pages" }],
    webhookUrl,
  });
  await run(e, t(0));
  await run(e, t(15));
  assert.equal(e.webhookCalls.length, 1);
  assert.equal(e.webhookCalls[0].url, webhookUrl);
  assert.match(e.webhookCalls[0].body.text, /⚠️ Homelab Silicon Offline/);
});
