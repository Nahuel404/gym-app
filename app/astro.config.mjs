// @ts-check
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://gymapp.not404.dev",
  output: "server",
  adapter: netlify(),
  vite: {
    ssr: {
      external: ["crypto", "node:crypto"],
    },
  },
});
