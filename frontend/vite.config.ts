import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode - Vite automatically loads .env.[mode]
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    envPrefix: 'VITE_',
    server: {
      host: "::", // Listen on all interfaces for external access
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define environment-specific settings
    define: {
      __VITE_MODE__: JSON.stringify(mode),
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || 'http://localhost:4000/api'),
    },
  }
});
