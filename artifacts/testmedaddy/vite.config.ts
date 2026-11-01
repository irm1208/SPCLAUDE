import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Testmedaddy runs on its own port (21505 in development, mapped to external 3002 in
// .replit) and talks to the shared API through the /api proxy. In production the API
// serves dist/public itself on the Testmedaddy hosts.
const port = Number(process.env.PORT ?? "21505");
if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") }, dedupe: ["react", "react-dom"] },
  root: path.resolve(import.meta.dirname),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    watch: process.env.VITE_NO_WATCH ? null : undefined,
    hmr: process.env.REPL_ID !== undefined ? { clientPort: 443, protocol: "wss" } : true,
    headers: { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" },
    proxy: {
      "/api": { target: `http://127.0.0.1:${process.env.API_PORT ?? "8080"}`, changeOrigin: false },
    },
    fs: { strict: true, deny: ["**/.*"] },
  },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
