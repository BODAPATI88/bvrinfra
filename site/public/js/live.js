// Refreshes the "Live from my infrastructure" panel from the Upptime summary
// (BODAPATI88/status). The page already shows build-time figures, so a failed
// fetch leaves those in place and only changes the note.
(function () {
  var root = document.querySelector("[data-live-root]");
  if (!root || !window.fetch) return;
  var pick = function (name) { return root.querySelector('[data-live="' + name + '"]'); };
  var note = pick("note");

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
      var at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      note.firstChild.textContent = "Status figures loaded live at " + at + " from my ";
    })
    .catch(function () {
      note.firstChild.textContent = "Showing figures from the last build. Live figures are on the ";
    });
})();
