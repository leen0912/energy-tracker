import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icon.svg",
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "日迹 · 生活的回响",
        short_name: "日迹",
        lang: "zh-CN",
        description: "收藏时间，也收藏自己的感受。",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#f7f8fa",
        background_color: "#f7f8fa",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: { clientsClaim: true, globPatterns: ["**/*.{js,css,html,png,svg,woff2}"] },
    }),
  ],
});
