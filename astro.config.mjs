import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.zhicheng233.top",
  output: "static",
  build: {
    format: "directory",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
