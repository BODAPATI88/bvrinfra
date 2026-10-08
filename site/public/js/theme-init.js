// Applies a saved theme before first paint so it never flashes the wrong colours.
(function () {
        var mode = "auto";
        try { mode = localStorage.getItem("theme") || "auto"; } catch (e) {}
        if (mode === "light" || mode === "dark") {
          document.documentElement.dataset.theme = mode;
          var c = mode === "dark" ? "#11171d" : "#e9eef2";
          document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", c); });
        }
      })();
