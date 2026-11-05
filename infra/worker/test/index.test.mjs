// node --test infra/worker/test — checks the failover rules without Cloudflare.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { ORIGIN: "https://origin.example", FALLBACK: "https://pages.example", TIMEOUT_MS: "50" };
const req = (path = "/", method = "GET") => new Request(`https://bvrinfra.in${path}`, { method, headers: { cookie: "secret=1", accept: "text/html" } });

function stubFetch(handlers) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ host: u.host, path: u.pathname, init });
    return handlers[u.host](u, init);
  };
  return calls;
}

test("homelab answers: served by homelab, no cookies forwarded", async () => {
  const calls = stubFetch({ "origin.example": () => new Response("home", { status: 200 }) });
  const res = await worker.fetch(req("/skills/"), env);
  assert.equal(res.headers.get("X-Served-By"), "homelab");
  assert.equal(await res.text(), "home");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.get("cookie"), null);
  assert.equal(calls[0].init.headers.get("accept"), "text/html");
});

test("homelab 404 is a real answer, not a failover", async () => {
  stubFetch({ "origin.example": () => new Response("nf", { status: 404 }) });
  const res = await worker.fetch(req("/nope"), env);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("X-Served-By"), "homelab");
});

test("homelab 502: falls back to pages, same path", async () => {
  const calls = stubFetch({
    "origin.example": () => new Response("bad", { status: 502 }),
    "pages.example": (u) => new Response("pages " + u.pathname, { status: 200 }),
  });
  const res = await worker.fetch(req("/architecture/?x=1"), env);
  assert.equal(res.headers.get("X-Served-By"), "pages");
  assert.equal(await res.text(), "pages /architecture/");
  assert.equal(calls[1].path, "/architecture/");
});

test("homelab too slow: falls back within the timeout", async () => {
  stubFetch({
    "origin.example": (u, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    "pages.example": () => new Response("pages", { status: 200 }),
  });
  const t0 = Date.now();
  const res = await worker.fetch(req("/"), env);
  assert.equal(res.headers.get("X-Served-By"), "pages");
  assert.ok(Date.now() - t0 < 1000);
});

test("homelab unreachable (tunnel down): falls back", async () => {
  stubFetch({
    "origin.example": () => { throw new TypeError("connect failed"); },
    "pages.example": () => new Response("pages", { status: 200 }),
  });
  const res = await worker.fetch(req("/"), env);
  assert.equal(res.headers.get("X-Served-By"), "pages");
});

test("redirects stay on bvrinfra.in", async () => {
  stubFetch({ "origin.example": () => new Response(null, { status: 301, headers: { Location: "https://origin.example/architecture/" } }) });
  const res = await worker.fetch(req("/architecture"), env);
  assert.equal(res.headers.get("Location"), "/architecture/");
});

test("POST is refused", async () => {
  stubFetch({});
  const res = await worker.fetch(req("/", "POST"), env);
  assert.equal(res.status, 405);
});
