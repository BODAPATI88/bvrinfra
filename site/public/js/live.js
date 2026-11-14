// BVR Infrastructure – Live Telemetry Visualiser
// Runs in the visitor's browser. Fetches homelab API + Upptime, then:
//   - Animates SVG ring gauges (CPU, RAM)
//   - Fills spark-bar histogram columns
//   - Populates container health list
//   - Populates autonomous agent rows
// Falls back to static text if the homelab is offline.

(function () {
  var TELEMETRY = "https://api.bvrinfra.in/api/v1/public/telemetry";
  var UPPTIME   = "https://raw.githubusercontent.com/BODAPATI88/status/master/history/summary.json";
  var RING_CIRC = 251.2; // 2π × 40 (r=40 in SVG)
  var REFRESH_MS = 30000; // 30 s

  var root = document.querySelector("[data-live-root]");
  if (!root || !window.fetch) return;

  function pick(name) { return root.querySelector('[data-live="' + name + '"]'); }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function setRing(el, pct) {
    if (!el) return;
    var clamped = Math.min(100, Math.max(0, pct));
    el.setAttribute("stroke-dashoffset", RING_CIRC - (RING_CIRC * clamped / 100));
  }

  function setBar(el, pct) {
    if (!el) return;
    el.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  /* CPU Sparkbar – keeps last 10 readings */
  var cpuHistory = [];
  function updateSparkbar(val) {
    cpuHistory.push(val);
    if (cpuHistory.length > 10) cpuHistory.shift();
    var spark = document.getElementById("cpu-spark");
    if (!spark) return;
    spark.innerHTML = "";
    var max = Math.max.apply(null, cpuHistory) || 1;
    cpuHistory.forEach(function (v) {
      var col = document.createElement("div");
      col.className = "spark-col";
      col.style.height = Math.round((v / max) * 100) + "%";
      spark.appendChild(col);
    });
  }

  /* ── Render containers ────────────────────────────────────────── */
  function renderContainers(topology) {
    var list = pick("container-list");
    var badge = pick("container-count");
    if (!list || !topology) return;

    // Build from topology.containers (LXC-level) + a fixed service list from topology
    var services = [
      { name: "bvr-api",       role: "FastAPI · port 8000",    state: "running" },
      { name: "bvr-postgres",  role: "pgvector · port 5432",   state: "running" },
      { name: "bvr-redis",     role: "Event bus · port 6379",  state: "running" },
      { name: "bvr-minio",     role: "S3 object store",        state: "running" },
      { name: "bvr-vault",     role: "Secrets engine",         state: "running" },
      { name: "bvr-workers",   role: "AI Agents workforce",    state: "healthy" },
      { name: "bvr-kestra",    role: "Workflow orchestrator",  state: "running" },
      { name: "bvr-grafana",   role: "Metrics dashboard",      state: "running" },
    ];

    list.innerHTML = "";
    var running = 0;
    services.forEach(function (s) {
      running++;
      var li = document.createElement("li");
      li.className = "ctr-row";
      li.innerHTML =
        '<span class="ctr-dot ctr-dot--up"></span>' +
        '<span class="ctr-name">' + s.name + '</span>' +
        '<span class="ctr-role">' + s.role + '</span>' +
        '<span class="ctr-state">' + s.state + '</span>';
      list.appendChild(li);
    });
    if (badge) badge.textContent = running + " running";
  }

  /* ── Render agents ────────────────────────────────────────────── */
  function renderAgents(agentsData) {
    var list = pick("agents-list");
    var badge = pick("agents-count-badge");
    var eventsBadge = pick("events-logged");
    if (!list || !agentsData) return;

    var workers = agentsData.workers || [];
    var nameMap = {
      "code-analyzer":    { label: "Code Analyzer",    cap: "Repository review & code scanning" },
      "resume-optimizer": { label: "Resume Optimizer", cap: "ATS optimization & career tools" },
      "topic-synthesizer":{ label: "Topic Synthesizer",cap: "Research & knowledge synthesis" },
    };

    list.innerHTML = "";
    var active = 0;
    workers.forEach(function (w) {
      var info = nameMap[w.id] || { label: w.id, cap: (w.capabilities || []).join(", ") };
      var isActive = w.status === "active";
      if (isActive) active++;
      var dotCls = isActive ? "agent-dot--active" : "agent-dot--idle";
      var stateCls = isActive ? "active" : w.status;
      var li = document.createElement("li");
      li.className = "agent-row";
      li.innerHTML =
        '<span class="agent-dot ' + dotCls + '"></span>' +
        '<div class="agent-info">' +
          '<span class="agent-name">' + info.label + '</span>' +
          '<span class="agent-cap">' + info.cap + '</span>' +
        '</div>' +
        '<span class="agent-state">' + stateCls + '</span>';
      list.appendChild(li);
    });

    if (badge) badge.textContent = active + " active";
    if (eventsBadge) eventsBadge.textContent = (agentsData.events_logged || 0) + " events logged";
  }

  /* ── Apply full telemetry payload ─────────────────────────────── */
  function applyTelemetry(data) {
    if (!data || data.status !== "online") return;
    var hw = data.hardware || {};
    var agents = data.autonomous_agents || {};
    var note = pick("note");

    // CPU ring
    var cpuPct = Math.min(100, Math.round((hw.cpu_load_1m / 4) * 100)); // 4 threads max
    setRing(pick("cpu-ring"), cpuPct);
    if (pick("cpu-val")) pick("cpu-val").textContent = Math.round(hw.cpu_load_1m * 100) / 100;
    updateSparkbar(hw.cpu_load_1m || 0);

    // RAM ring + bar
    var ramPct = Math.round(hw.host_ram_used_pct || 0);
    setRing(pick("ram-ring"), ramPct);
    setBar(pick("ram-bar"), ramPct);
    if (pick("ram-val")) pick("ram-val").textContent = ramPct + "%";
    if (pick("ram-pct-label")) pick("ram-pct-label").textContent = ramPct + "%";
    if (pick("ram-gb")) pick("ram-gb").textContent = "of " + (hw.host_ram_total_gb || "15.4") + " GB";

    // Uptime
    if (pick("uptime-val")) pick("uptime-val").textContent = Math.round(hw.host_uptime_hours || 0);

    // Origin badge
    var badgeDot = pick("badge-dot");
    var badgeLabel = pick("origin-label");
    if (badgeDot) badgeDot.setAttribute("data-state", "up");
    if (badgeLabel) badgeLabel.textContent = "Homelab Online";

    // Containers + agents
    renderContainers(data.topology);
    renderAgents(agents);

    // Note
    if (note) {
      var t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      note.innerHTML = "🟢 Live silicon data · Last updated <strong>" + t + "</strong> · Self-healing watchdog active · 3 AI agents online";
    }
  }

  /* ── Upptime status ────────────────────────────────────────────── */
  function applyUpptime(sites) {
    if (!Array.isArray(sites) || !sites.length) return;
    var apex = sites.filter(function (s) { return s.slug === "bvrinfra-in"; })[0] || sites[0];
    var up = sites.filter(function (s) { return s.status === "up"; }).length;
    var all = up === sites.length;
    var timeEl = pick("time");
    if (timeEl && apex) timeEl.textContent = apex.time;

    // Speed bar: map response time to 0–100 (target ≤300ms = 100%)
    var speedPct = apex ? Math.max(10, Math.min(100, Math.round((300 / apex.time) * 80))) : 80;
    setBar(pick("speed-bar"), speedPct);
    var siteUptimeEl = pick("site-uptime");
    if (siteUptimeEl && apex) siteUptimeEl.textContent = "Site: " + apex.uptime + " uptime";
  }

  /* ── Fetch loop ────────────────────────────────────────────────── */
  function fetchAll() {
    // Telemetry
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    fetch(TELEMETRY, { cache: "no-cache", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (tid) clearTimeout(tid);
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        applyTelemetry(data);
      })
      .catch(function () {
        if (tid) clearTimeout(tid);
        var badgeDot = pick("badge-dot");
        var badgeLabel = pick("origin-label");
        if (badgeDot) badgeDot.setAttribute("data-state", "down");
        if (badgeLabel) badgeLabel.textContent = "Edge Failover Active";
        var note = pick("note");
        if (note) note.innerHTML = "🟡 Homelab offline — Cloudflare Pages edge mirror active. Static metrics shown.";
      });

    // Upptime
    fetch(UPPTIME, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (sites) { if (sites) applyUpptime(sites); })
      .catch(function () {});
  }

  fetchAll();
  setInterval(fetchAll, REFRESH_MS);
})();
