// Applies the saved theme before first paint so it never flashes the wrong colours.
// First-time visitors get dark; "auto" is stored explicitly once chosen (#62).
(function () {
        var mode = "auto";
        try { mode = localStorage.getItem("theme") || "dark"; } catch (e) { mode = "dark"; }
        if (mode === "light" || mode === "dark") {
          document.documentElement.dataset.theme = mode;
          var c = mode === "dark" ? "#0a0f14" : "#e9eef2";
          document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", c); });
        }
      })();
