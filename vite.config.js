import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// base = Repo-Name, damit die Seite unter
// https://<benutzer>.github.io/NavBib/ korrekt laedt.
export default defineConfig({
  plugins: [react()],
  base: "/NavBib/",
  build: {
    rollupOptions: {
      input: {
        // Besuch und Verwaltung
        main: resolve(__dirname, "index.html"),
        // Werkzeug zum Einzeichnen von Regalen, Treppen und Zonen
        erfassung: resolve(__dirname, "erfassung.html"),
      },
    },
  },
});
