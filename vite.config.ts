import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import dotenv from "dotenv";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { HOST } from "./src/frontend/src/lib/const";
import { svelteTesting } from "@testing-library/svelte/vite";

dotenv.config();

export default defineConfig({
  plugins: [sveltekit(), svelteTesting(), nodePolyfills()],

  server: {
    proxy: {
      "/api": HOST,
    },
  },

  define: {
    "process.env": process.env,
  },

  build: {
    target: "esnext",
    sourcemap: true,
  },

  test: {
    environment: "jsdom",
  },
});
