// Auto / Light / Dark switch. Stored per browser; works for the visit if storage is blocked.
(function () {
    var root = document.documentElement;
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    var LIGHT = "#e9eef2", DARK = "#11171d";
    var mode = root.dataset.theme || "auto";

    function apply(next) {
      if (next === "auto") {
        delete root.dataset.theme;
        metas[0] && metas[0].setAttribute("content", LIGHT);
        metas[1] && metas[1].setAttribute("content", DARK);
      } else {
        root.dataset.theme = next;
        metas.forEach(function (m) { m.setAttribute("content", next === "dark" ? DARK : LIGHT); });
      }
      try {
        if (next === "auto") localStorage.removeItem("theme");
        else localStorage.setItem("theme", next);
      } catch (e) {}
    }

    document.querySelectorAll('.theme-switch input[name="theme"]').forEach(function (input) {
      input.checked = input.value === mode;
      input.addEventListener("change", function () { if (input.checked) apply(input.value); });
    });
  })();
