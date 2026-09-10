import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: "../../../node_modules/.vite/flowmind-production-scheduler-relay",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
