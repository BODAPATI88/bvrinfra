// Accessibility scan for CI (bvrinfra#31): axe-core on the built site, in both themes.
// Fails on any serious or critical violation. Usage: node scripts/axe-check.mjs <base-url>
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const base = process.argv[2] ?? "http://localhost:4330";
const pages = ["/", "/projects/", "/skills/", "/contact/", "/writing/september-2026-outage/"];
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const browser = await chromium.launch();
let failures = 0;
for (const theme of ["dark", "light"]) {
  for (const path of pages) {
    // Reduced motion turns off the colour transitions, so axe never sees a half-changed theme.
    const page = await browser.newPage({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(base + path);
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() =>
      window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }),
    );
    const blocking = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const minor = result.violations.length - blocking.length;
    console.log(`${theme.padEnd(5)} ${path.padEnd(34)} serious/critical: ${blocking.length}, minor: ${minor}`);
    for (const v of blocking) {
      console.log(`  ${v.impact}: ${v.id} (${v.nodes.length}) ${v.helpUrl}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(" ")}`);
    }
    failures += blocking.length;
    await page.close();
  }
}
await browser.close();
if (failures > 0) {
  console.error(`::error::axe found ${failures} serious or critical accessibility violation(s).`);
  process.exit(1);
}
console.log("axe: no serious or critical violations.");
