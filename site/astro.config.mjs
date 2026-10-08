import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://bvrinfra.in",
  trailingSlash: "ignore",
  integrations: [sitemap({ filter: (page) => !page.includes("/404") })],
});
