import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react-swc"
import { PolyfillOptions, nodePolyfills } from "vite-plugin-node-polyfills"
import tailwindcss from "@tailwindcss/vite"

// Unfortunate, but needed due to https://github.com/davidmyersdev/vite-plugin-node-polyfills/issues/81
// Suspected to be because of the yarn workspace setup, but not sure
const nodePolyfillsFix = (options?: PolyfillOptions | undefined): Plugin => {
  return {
    ...nodePolyfills(options),
    /* @ts-expect-error: override Vite's resolveId for specific polyfill shims */
    resolveId(source: string) {
      const m = /^vite-plugin-node-polyfills\/shims\/(buffer|global|process)$/.exec(source)
      if (m) {
        return `./node_modules/vite-plugin-node-polyfills/shims/${m[1]}/dist/index.cjs`
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    base: "./",
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfillsFix({ include: ["buffer", "net", "path", "stream", "tty", "vm", "util"] }),
    ],
    define: {
      "process.env": JSON.stringify({
        REOWN_PROJECT_ID: env.REOWN_PROJECT_ID,
        AZTEC_TOKEN_FAUCET_URL: env.AZTEC_TOKEN_FAUCET_URL,
      }),
    },
  }
})
