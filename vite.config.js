import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base = Repo-Name, damit die Seite unter
// https://<benutzer>.github.io/NavBib/ korrekt laedt.
export default defineConfig({
  plugins: [react()],
  base: "/NavBib/",
});
