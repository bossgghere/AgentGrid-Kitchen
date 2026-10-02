import esbuild from "esbuild";
import fs from "fs";
import path from "path";

// Ensure dist directories exist
const dirs = ["dist/main", "dist/preload", "dist/renderer"];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const nodeBrowserStubPlugin = {
  name: "node-browser-stub",
  setup(build) {
    build.onResolve({ filter: /^(path|os|fs)$/ }, (args) => ({
      path: args.path,
      namespace: "node-browser-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "node-browser-stub" }, (args) => {
      if (args.path === "path") {
        return {
          contents: `
            export const join = (...args) => args.join("/");
            export const resolve = (...args) => args.join("/");
            export default { join, resolve };
          `,
        };
      }
      if (args.path === "os") {
        return {
          contents: `
            export const homedir = () => "/";
            export default { homedir };
          `,
        };
      }
      if (args.path === "fs") {
        return {
          contents: `export default {};`,
        };
      }
    });
  },
};

async function build() {
  console.log("⚡ Building AgentGrid Kitchen bundle with esbuild...");

  // 1. Build Main Process
  await esbuild.build({
    entryPoints: ["src/main/index.ts"],
    outfile: "dist/main/index.js",
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    external: ["electron", "better-sqlite3", "node-pty", "fsevents", "chokidar"],
    sourcemap: true,
  });
  console.log("  ✓ Main process -> dist/main/index.js");

  // 2. Build Preload Script
  await esbuild.build({
    entryPoints: ["src/preload/index.ts"],
    outfile: "dist/preload/index.js",
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    external: ["electron"],
    sourcemap: true,
  });
  console.log("  ✓ Preload script -> dist/preload/index.js");

  // 3. Build Renderer UI
  await esbuild.build({
    entryPoints: ["src/renderer/main.tsx"],
    outfile: "dist/renderer/main.js",
    bundle: true,
    platform: "browser",
    target: "chrome110",
    format: "esm",
    jsx: "automatic",
    plugins: [nodeBrowserStubPlugin],
    sourcemap: true,
    define: {
      "process.env.NODE_ENV": '"development"',
    },
  });
  console.log("  ✓ Renderer UI -> dist/renderer/main.js");

  console.log("🚀 Build finished successfully!");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
