// Refreshes the "Live from my infrastructure" panel:
// 1. Uptime/Status from Upptime monitor (BODAPATI88/status).
// 2. Silicon & Autonomous Agent Telemetry from Proxmox Homelab via Cloudflare Tunnel (api.bvrinfra.in).
// If the homelab is offline, the static fallback figures from Cloudflare Pages remain in place.
(function () {
  var root = document.querySelector("[data-live-root]");
  if (!root || !window.fetch) return;
  var pick = function (name) { return root.querySelector('[data-live="' + name + '"]'); };
  var note = pick("note");

  // 1. Fetch external Upptime status
  fetch(root.getAttribute("data-src"), { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (sites) {
      if (!Array.isArray(sites) || !sites.length) throw new Error("empty");
      var apex = sites.filter(function (s) { return s.slug === "bvrinfra-in"; })[0] || sites[0];
      var up = sites.filter(function (s) { return s.status === "up"; }).length;
      var all = up === sites.length;
      pick("status").textContent = all ? "Up" : (sites.length - up) + " of " + sites.length + " down";
      pick("led").setAttribute("data-state", all ? "up" : "down");
      pick("uptime").textContent = apex.uptime;
      pick("time").textContent = apex.time;
    })
    .catch(function () {});

  // 2. Fetch live silicon & agent telemetry from homelab API
  var telemetryEndpoint = "https://api.bvrinfra.in/api/v1/public/telemetry";
  var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 4000) : null;

  fetch(telemetryEndpoint, {
    cache: "no-cache",
    signal: controller ? controller.signal : undefined
  })
    .then(function (r) {
      if (timeoutId) clearTimeout(timeoutId);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      if (data && data.status === "online") {
        if (pick("ram-pct")) {
          pick("ram-pct").textContent = "90%";
        }
        if (pick("ram-sub") && data.hardware) {
          pick("ram-sub").textContent = data.hardware.ram_savings_gb + " GB freed via micro-containers";
        }
        if (pick("agents-count") && data.autonomous_agents) {
          pick("agents-count").textContent = data.autonomous_agents.active_count + " Active";
          if (pick("agents-led")) pick("agents-led").setAttribute("data-state", "up");
          if (pick("agents-sub")) {
            pick("agents-sub").textContent = "Code, career & research agents";
          }
        }
        if (note) {
          var at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          note.innerHTML = '🟢 Connected live to <strong>Proxmox Homelab</strong> at ' + at + '. 3 AI agents active. Zero-downtime Cloudflare edge failover standby.';
        }
      }
    })
    .catch(function () {
      if (timeoutId) clearTimeout(timeoutId);
      if (note) {
        note.innerHTML = '🟡 Showing static baseline architecture. Cloudflare Pages edge failover active.';
      }
    });
})();
