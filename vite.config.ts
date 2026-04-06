import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const buildId = Date.now().toString(36);

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "inject-build-id",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `<meta name="wholefuel-build-id" content="${buildId}">\n  </head>`
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
