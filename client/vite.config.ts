import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxy = {
  "/api": {
    target: "http://localhost:4000",
    changeOrigin: true,
  },
  "/uploads": {
    target: "http://localhost:4000",
    changeOrigin: true,
  },
  "/socket.io": {
    target: "http://localhost:4000",
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "data-vendor": ["@tanstack/react-query", "zustand"],
          "forms-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          "maps-vendor": ["leaflet", "leaflet.markercluster"],
        },
      },
    },
  },
});