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

    var ORDER = ["auto", "light", "dark"];
    var NAMES = { auto: "Auto", light: "Light", dark: "Dark" };
    var inputs = document.querySelectorAll('.theme-switch input[name="theme"]');
    var cycle = document.querySelector(".theme-cycle");

    // Keep the radio switch (wide screens) and the cycle button (phones) in step.
    function sync() {
      inputs.forEach(function (input) { input.checked = input.value === mode; });
      if (cycle) {
        cycle.dataset.mode = mode;
        cycle.setAttribute("aria-label", "Colour theme: " + NAMES[mode] + ". Change theme");
      }
    }
    function set(next) { mode = next; apply(next); sync(); }

    inputs.forEach(function (input) {
      input.addEventListener("change", function () { if (input.checked) set(input.value); });
    });
    if (cycle) {
      cycle.addEventListener("click", function () {
        set(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
      });
    }
    sync();
  })();
