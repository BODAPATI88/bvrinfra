// bvrinfra.in front door (#101): the homelab first, Cloudflare Pages when the homelab can't answer.
//
// Every request goes to the homelab origin (k3s-apps, through a Cloudflare Tunnel). If it doesn't
// answer within TIMEOUT_MS, or answers with a 5xx, the same path is served from the Pages copy.
// Nothing is cached here: each visit sees what the origin serves now (Ravi, 17 Oct: real-time data).
// The response carries X-Served-By: homelab | pages, so anyone can see which one answered.

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export default {
  async fetch(request, env) {
    if (!SAFE_METHODS.has(request.method)) {
      return new Response("Method not allowed\n", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    const timeoutMs = Number(env.TIMEOUT_MS || 2500);

    try {
      const res = await fetchWithTimeout(new URL(path, env.ORIGIN), request, timeoutMs);
      if (res.status < 500) return label(res, "homelab");
    } catch {
      // Timeout or connection error: fall through to Pages.
    }
    const fallback = await fetch(new URL(path, env.FALLBACK), forward(request));
    return label(fallback, "pages");
  },
};

async function fetchWithTimeout(target, request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(target, { ...forward(request), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Only the headers a static site needs; never forward cookies or auth to either origin.
function forward(request) {
  const headers = new Headers();
  for (const name of ["accept", "accept-encoding", "accept-language", "if-none-match", "if-modified-since", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return { method: request.method, headers, redirect: "manual", cf: { cacheTtl: -1 } };
}

function label(res, servedBy) {
  const out = new Response(res.body, res);
  out.headers.set("X-Served-By", servedBy);
  // Redirects from either origin point at its own host; keep visitors on bvrinfra.in.
  const location = out.headers.get("Location");
  if (location) {
    try {
      const target = new URL(location, "https://bvrinfra.in");
      if (target.hostname !== "bvrinfra.in") out.headers.set("Location", target.pathname + target.search);
    } catch {}
  }
  return out;
}
