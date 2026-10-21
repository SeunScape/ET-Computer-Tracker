import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(root, "index.html"),
        login: resolve(root, "login.dc.html"),
        intake: resolve(root, "Intake.dc.html"),
        job: resolve(root, "Job.dc.html"),
        main: resolve(root, "Main.dc.html"),
        phone: resolve(root, "Phone.dc.html"),
        saved: resolve(root, "Saved.dc.html"),
      },
    },
  },
});