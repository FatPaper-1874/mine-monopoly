// vite.config.ts
import { defineConfig } from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/vite@4.1.0_@types+node@20.6.4_sass@1.58.3/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/@vitejs+plugin-vue@4.0.0_vi_ed3ccac861cf0dbb19b2ab4c29c77650/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import electron from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/vite-plugin-electron@0.29.0_9e45a57c461826f3fba03c6ac4fced36/node_modules/vite-plugin-electron/dist/simple.mjs";
import path2 from "path";
import Components from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/unplugin-vue-components@29._f11416202a9d87e6e9d4a9866c045e8f/node_modules/unplugin-vue-components/dist/vite.js";
import { AntDesignVueResolver } from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/unplugin-vue-components@29._f11416202a9d87e6e9d4a9866c045e8f/node_modules/unplugin-vue-components/dist/resolvers.js";

// plugins/vite-plugin-generate-monaco-dts.ts
import fs from "fs";
import path from "path";
import ts from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/typescript@5.9.2/node_modules/typescript/lib/typescript.js";
import { generateDtsBundle } from "file:///C:/DEV/code/repo/fatpaper-monopoly/node_modules/.pnpm/dts-bundle-generator@9.5.1/node_modules/dts-bundle-generator/dist/bundle-generator.js";
var __vite_injected_original_dirname = "C:\\DEV\\code\\repo\\fatpaper-monopoly\\apps\\map-editor\\plugins";
function generateMonacoDTS() {
  function generateForFile(tsFile) {
    const outDir = path.dirname(tsFile);
    const content = generateDtsBundle(
      [
        {
          filePath: tsFile,
          output: {
            noBanner: true,
            inlineDeclareGlobals: true
          }
        }
      ],
      { preferredConfigPath: path.resolve(__vite_injected_original_dirname, "../../../tsconfig.json") }
    );
    const targetPath = path.join(outDir, path.basename(tsFile, path.extname(tsFile)) + ".d.ts");
    const globalContent = toGlobalDts(content[0]);
    fs.writeFileSync(targetPath, globalContent, "utf8");
    console.log(
      `[monaco-dts] Generated: ${path.relative(process.cwd(), outDir)}\\${path.basename(tsFile, ".ts")}.d.ts`
    );
  }
  function scanAndGenerate() {
    function walk(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          walk(fullPath);
        } else if (file.isFile() && file.name.endsWith(".ts")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.startsWith("//@need-to-parse")) {
            generateForFile(fullPath);
          }
        }
      }
    }
    walk(path.resolve(process.cwd(), "./src"));
  }
  return {
    name: "vite-plugin-generate-monaco-dts",
    buildStart() {
      scanAndGenerate();
    },
    configureServer(server) {
      server.watcher.on("change", (file) => {
        if (file.endsWith(".ts")) {
          const content = fs.readFileSync(file, "utf-8");
          if (content.startsWith("//@need-to-parse")) {
            console.log(`[monaco-dts] Updating ${file}`);
            generateForFile(file);
          }
        }
      });
    }
    // closeBundle() {
    // 	scanAndGenerate();
    // },
  };
}
function toGlobalDts(modularContent) {
  let text = modularContent;
  text = text.replace(/^\s*export\s*\{\s*[^}]*\}\s*;?\s*$/gm, "");
  text = text.replace(/^\s*export\s*;\s*$/gm, "");
  text = text.replace(/\bexport\s+declare\b/g, "declare");
  text = text.replace(/\bexport\s+(interface|type|class|function|const|let|var|namespace)\b/g, "$1");
  text = text.replace(/\bexport\s+default\s+interface\b/g, "interface");
  text = text.replace(/\bexport\s+default\s+class\b/g, "class");
  text = text.replace(/\bexport\s+default\s+type\b/g, "type");
  text = text.replace(/\bexport\s+default\s+function\b/g, "function");
  text = text.replace(/\bexport\s+default\s+/g, "");
  const hasDeclareGlobal = /declare\s+global\s*\{/.test(text);
  text = text.split(/\r?\n/).filter((l, i, arr) => {
    var _a;
    return !(l.trim() === "" && ((_a = arr[i - 1]) == null ? void 0 : _a.trim()) === "");
  }).join("\n").trim();
  text = text.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/gm, "");
  return text + "\n";
}

// vite.config.ts
var __vite_injected_original_dirname2 = "C:\\DEV\\code\\repo\\fatpaper-monopoly\\apps\\map-editor";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    // interfaceToProtoPlugin({
    // 	inputPath: "../../packages/types/interfaces/game/map.ts",
    // 	outputPath: "./protos/game_map.proto",
    // }),
    // monacoEditorPlugin({
    // 	languageWorkers: ["editorWorkerService", "typescript", "html"],
    // }),
    generateMonacoDTS(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: "less"
          // 使用 Less 样式（Ant Design 默认）
        })
      ],
      dts: true
    }),
    electron({
      main: {
        entry: "electron/main.ts"
      },
      preload: {
        input: path2.join(__vite_injected_original_dirname2, "electron/preload.ts")
      },
      renderer: process.env.NODE_ENV === "test" ? void 0 : {}
    })
  ],
  build: {
    outDir: "dist/frontend"
  },
  resolve: {
    alias: [
      {
        find: "@src",
        replacement: path2.resolve(path2.dirname("./"), "src")
      }
    ]
  },
  worker: {
    format: "es"
    // 重要：让 worker 用 ESM 格式
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGx1Z2lucy92aXRlLXBsdWdpbi1nZW5lcmF0ZS1tb25hY28tZHRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcREVWXFxcXGNvZGVcXFxccmVwb1xcXFxmYXRwYXBlci1tb25vcG9seVxcXFxhcHBzXFxcXG1hcC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXERFVlxcXFxjb2RlXFxcXHJlcG9cXFxcZmF0cGFwZXItbW9ub3BvbHlcXFxcYXBwc1xcXFxtYXAtZWRpdG9yXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9ERVYvY29kZS9yZXBvL2ZhdHBhcGVyLW1vbm9wb2x5L2FwcHMvbWFwLWVkaXRvci92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCB2dWUgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXZ1ZVwiO1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSBcInZpdGUtcGx1Z2luLWVsZWN0cm9uL3NpbXBsZVwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tIFwidW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZVwiO1xyXG5pbXBvcnQgeyBBbnREZXNpZ25WdWVSZXNvbHZlciB9IGZyb20gXCJ1bnBsdWdpbi12dWUtY29tcG9uZW50cy9yZXNvbHZlcnNcIjtcclxuaW1wb3J0IG1vbmFjb0VkaXRvclBsdWdpbiBmcm9tIFwidml0ZS1wbHVnaW4tbW9uYWNvLWVkaXRvci1lc21cIjtcclxuaW1wb3J0IGdlbmVyYXRlTW9uYWNvRFRTIGZyb20gXCIuL3BsdWdpbnMvdml0ZS1wbHVnaW4tZ2VuZXJhdGUtbW9uYWNvLWR0c1wiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcblx0cGx1Z2luczogW1xyXG5cdFx0dnVlKCksXHJcblx0XHQvLyBpbnRlcmZhY2VUb1Byb3RvUGx1Z2luKHtcclxuXHRcdC8vIFx0aW5wdXRQYXRoOiBcIi4uLy4uL3BhY2thZ2VzL3R5cGVzL2ludGVyZmFjZXMvZ2FtZS9tYXAudHNcIixcclxuXHRcdC8vIFx0b3V0cHV0UGF0aDogXCIuL3Byb3Rvcy9nYW1lX21hcC5wcm90b1wiLFxyXG5cdFx0Ly8gfSksXHJcblx0XHQvLyBtb25hY29FZGl0b3JQbHVnaW4oe1xyXG5cdFx0Ly8gXHRsYW5ndWFnZVdvcmtlcnM6IFtcImVkaXRvcldvcmtlclNlcnZpY2VcIiwgXCJ0eXBlc2NyaXB0XCIsIFwiaHRtbFwiXSxcclxuXHRcdC8vIH0pLFxyXG5cdFx0Z2VuZXJhdGVNb25hY29EVFMoKSxcclxuXHRcdENvbXBvbmVudHMoe1xyXG5cdFx0XHRyZXNvbHZlcnM6IFtcclxuXHRcdFx0XHRBbnREZXNpZ25WdWVSZXNvbHZlcih7XHJcblx0XHRcdFx0XHRpbXBvcnRTdHlsZTogXCJsZXNzXCIsIC8vIFx1NEY3Rlx1NzUyOCBMZXNzIFx1NjgzN1x1NUYwRlx1RkYwOEFudCBEZXNpZ24gXHU5RUQ4XHU4QkE0XHVGRjA5XHJcblx0XHRcdFx0fSksXHJcblx0XHRcdF0sXHJcblx0XHRcdGR0czogdHJ1ZSxcclxuXHRcdH0pLFxyXG5cdFx0ZWxlY3Ryb24oe1xyXG5cdFx0XHRtYWluOiB7XHJcblx0XHRcdFx0ZW50cnk6IFwiZWxlY3Ryb24vbWFpbi50c1wiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRwcmVsb2FkOiB7XHJcblx0XHRcdFx0aW5wdXQ6IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiZWxlY3Ryb24vcHJlbG9hZC50c1wiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0cmVuZGVyZXI6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInRlc3RcIiA/IHVuZGVmaW5lZCA6IHt9LFxyXG5cdFx0fSksXHJcblx0XSxcclxuXHRidWlsZDoge1xyXG5cdFx0b3V0RGlyOiBcImRpc3QvZnJvbnRlbmRcIixcclxuXHR9LFxyXG5cdHJlc29sdmU6IHtcclxuXHRcdGFsaWFzOiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmaW5kOiBcIkBzcmNcIixcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShcIi4vXCIpLCBcInNyY1wiKSxcclxuXHRcdFx0fSxcclxuXHRcdF0sXHJcblx0fSxcclxuXHR3b3JrZXI6IHtcclxuXHRcdGZvcm1hdDogXCJlc1wiLCAvLyBcdTkxQ0RcdTg5ODFcdUZGMUFcdThCQTkgd29ya2VyIFx1NzUyOCBFU00gXHU2ODNDXHU1RjBGXHJcblx0fSxcclxufSk7XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcREVWXFxcXGNvZGVcXFxccmVwb1xcXFxmYXRwYXBlci1tb25vcG9seVxcXFxhcHBzXFxcXG1hcC1lZGl0b3JcXFxccGx1Z2luc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcREVWXFxcXGNvZGVcXFxccmVwb1xcXFxmYXRwYXBlci1tb25vcG9seVxcXFxhcHBzXFxcXG1hcC1lZGl0b3JcXFxccGx1Z2luc1xcXFx2aXRlLXBsdWdpbi1nZW5lcmF0ZS1tb25hY28tZHRzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9ERVYvY29kZS9yZXBvL2ZhdHBhcGVyLW1vbm9wb2x5L2FwcHMvbWFwLWVkaXRvci9wbHVnaW5zL3ZpdGUtcGx1Z2luLWdlbmVyYXRlLW1vbmFjby1kdHMudHNcIjtpbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xyXG5pbXBvcnQgeyBnZW5lcmF0ZUR0c0J1bmRsZSB9IGZyb20gXCJkdHMtYnVuZGxlLWdlbmVyYXRvclwiO1xyXG5cclxuZnVuY3Rpb24gcmVhZFRzQ29uZmlnKCkge1xyXG5cdGNvbnN0IHRzY29uZmlnUGF0aCA9IHRzLmZpbmRDb25maWdGaWxlKHByb2Nlc3MuY3dkKCksIHRzLnN5cy5maWxlRXhpc3RzLCBcInRzY29uZmlnLmpzb25cIik7XHJcblx0aWYgKCF0c2NvbmZpZ1BhdGgpIHJldHVybiB7fTtcclxuXHRjb25zdCBjb25maWdGaWxlID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdQYXRoLCB0cy5zeXMucmVhZEZpbGUpO1xyXG5cdGNvbnN0IHBhcnNlZCA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KGNvbmZpZ0ZpbGUuY29uZmlnLCB0cy5zeXMsIHBhdGguZGlybmFtZSh0c2NvbmZpZ1BhdGgpKTtcclxuXHRyZXR1cm4gcGFyc2VkLm9wdGlvbnM7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdlbmVyYXRlTW9uYWNvRFRTKCkge1xyXG5cdC8vIFx1NzUxRlx1NjIxMFx1NTM1NVx1NEUyQVx1NjU4N1x1NEVGNlx1NzY4NCBkLnRzXHJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVGb3JGaWxlKHRzRmlsZTogc3RyaW5nKSB7XHJcblx0XHRjb25zdCBvdXREaXIgPSBwYXRoLmRpcm5hbWUodHNGaWxlKTtcclxuXHJcblx0XHRjb25zdCBjb250ZW50ID0gZ2VuZXJhdGVEdHNCdW5kbGUoXHJcblx0XHRcdFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWxlUGF0aDogdHNGaWxlLFxyXG5cdFx0XHRcdFx0b3V0cHV0OiB7XHJcblx0XHRcdFx0XHRcdG5vQmFubmVyOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRpbmxpbmVEZWNsYXJlR2xvYmFsczogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XSxcclxuXHRcdFx0eyBwcmVmZXJyZWRDb25maWdQYXRoOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uLy4uL3RzY29uZmlnLmpzb25cIikgfVxyXG5cdFx0KTtcclxuXHRcdC8vIFx1OEY5M1x1NTFGQVx1NjU4N1x1NEVGNlx1NTQwRCA9IFx1NkU5MFx1NjU4N1x1NEVGNlx1NTQwQ1x1NTQwRFx1RkYwQ1x1NEY0Nlx1NjI2OVx1NUM1NVx1NTQwRFx1NjUzOVx1NEUzQSAuZC50c1xyXG5cdFx0Y29uc3QgdGFyZ2V0UGF0aCA9IHBhdGguam9pbihvdXREaXIsIHBhdGguYmFzZW5hbWUodHNGaWxlLCBwYXRoLmV4dG5hbWUodHNGaWxlKSkgKyBcIi5kLnRzXCIpO1xyXG5cclxuXHRcdGNvbnN0IGdsb2JhbENvbnRlbnQgPSB0b0dsb2JhbER0cyhjb250ZW50WzBdKTtcclxuXHJcblx0XHRmcy53cml0ZUZpbGVTeW5jKHRhcmdldFBhdGgsIGdsb2JhbENvbnRlbnQsIFwidXRmOFwiKTtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW21vbmFjby1kdHNdIEdlbmVyYXRlZDogJHtwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIG91dERpcil9XFxcXCR7cGF0aC5iYXNlbmFtZSh0c0ZpbGUsIFwiLnRzXCIpfS5kLnRzYFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIFx1NjI2Qlx1NjNDRiBzcmMgXHU0RTBCXHU1RTI2IC8vQG5lZWQtdG8tcGFyc2UgXHU3Njg0IHRzIFx1NjU4N1x1NEVGNlxyXG5cdGZ1bmN0aW9uIHNjYW5BbmRHZW5lcmF0ZSgpIHtcclxuXHRcdGZ1bmN0aW9uIHdhbGsoZGlyOiBzdHJpbmcpIHtcclxuXHRcdFx0Y29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcclxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcblx0XHRcdFx0Y29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBmaWxlLm5hbWUpO1xyXG5cdFx0XHRcdGlmIChmaWxlLmlzRGlyZWN0b3J5KCkpIHtcclxuXHRcdFx0XHRcdHdhbGsoZnVsbFBhdGgpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZmlsZS5pc0ZpbGUoKSAmJiBmaWxlLm5hbWUuZW5kc1dpdGgoXCIudHNcIikpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsIFwidXRmLThcIik7XHJcblx0XHRcdFx0XHRpZiAoY29udGVudC5zdGFydHNXaXRoKFwiLy9AbmVlZC10by1wYXJzZVwiKSkge1xyXG5cdFx0XHRcdFx0XHRnZW5lcmF0ZUZvckZpbGUoZnVsbFBhdGgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0d2FsayhwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgXCIuL3NyY1wiKSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0bmFtZTogXCJ2aXRlLXBsdWdpbi1nZW5lcmF0ZS1tb25hY28tZHRzXCIsXHJcblx0XHRidWlsZFN0YXJ0KCkge1xyXG5cdFx0XHRzY2FuQW5kR2VuZXJhdGUoKTtcclxuXHRcdH0sXHJcblx0XHRjb25maWd1cmVTZXJ2ZXIoc2VydmVyOiBhbnkpIHtcclxuXHRcdFx0c2VydmVyLndhdGNoZXIub24oXCJjaGFuZ2VcIiwgKGZpbGU6IGFueSkgPT4ge1xyXG5cdFx0XHRcdGlmIChmaWxlLmVuZHNXaXRoKFwiLnRzXCIpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGUsIFwidXRmLThcIik7XHJcblx0XHRcdFx0XHRpZiAoY29udGVudC5zdGFydHNXaXRoKFwiLy9AbmVlZC10by1wYXJzZVwiKSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgW21vbmFjby1kdHNdIFVwZGF0aW5nICR7ZmlsZX1gKTtcclxuXHRcdFx0XHRcdFx0Z2VuZXJhdGVGb3JGaWxlKGZpbGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0Ly8gY2xvc2VCdW5kbGUoKSB7XHJcblx0XHQvLyBcdHNjYW5BbmRHZW5lcmF0ZSgpO1xyXG5cdFx0Ly8gfSxcclxuXHR9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b0dsb2JhbER0cyhtb2R1bGFyQ29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRsZXQgdGV4dCA9IG1vZHVsYXJDb250ZW50O1xyXG5cclxuXHQvLyAxKSBcdTUzQkJcdTYzODkgXCJleHBvcnQge307XCIgXHU0RUU1XHU1M0NBXHU1QkZDXHU1MUZBXHU5NkM2XHU1NDA4IFwiZXhwb3J0IHsgQSwgQiB9XCJcclxuXHR0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxzKmV4cG9ydFxccypcXHtcXHMqW159XSpcXH1cXHMqOz9cXHMqJC9nbSwgXCJcIik7XHJcblx0dGV4dCA9IHRleHQucmVwbGFjZSgvXlxccypleHBvcnRcXHMqO1xccyokL2dtLCBcIlwiKTsgLy8gXHU0RkREXHU5NjY5XHJcblxyXG5cdC8vIDIpIFx1NjI4QVx1NUUzOFx1ODlDMVx1NzY4NFx1NUJGQ1x1NTFGQVx1NjgwN1x1OEJCMFx1NTNCQlx1NjM4OVx1RkYxQWV4cG9ydCBkZWNsYXJlIC8gZXhwb3J0IGludGVyZmFjZSAvIGV4cG9ydCB0eXBlIC8gZXhwb3J0IGNsYXNzIC8gZXhwb3J0IGZ1bmN0aW9uIC8gZXhwb3J0IGNvbnN0IC8gZXhwb3J0IGxldCAvIGV4cG9ydCB2YXIgLyBleHBvcnQgbmFtZXNwYWNlXHJcblx0dGV4dCA9IHRleHQucmVwbGFjZSgvXFxiZXhwb3J0XFxzK2RlY2xhcmVcXGIvZywgXCJkZWNsYXJlXCIpO1xyXG5cdHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcYmV4cG9ydFxccysoaW50ZXJmYWNlfHR5cGV8Y2xhc3N8ZnVuY3Rpb258Y29uc3R8bGV0fHZhcnxuYW1lc3BhY2UpXFxiL2csIFwiJDFcIik7XHJcblxyXG5cdC8vIDMpIFx1NTkwNFx1NzQwNiBcImV4cG9ydCBkZWZhdWx0XCJcdUZGMDhcdTVDM0RcdTkxQ0ZcdTRGRERcdTc1NTlcdTU4RjBcdTY2MEVcdUZGMENcdTUzQkJcdTYzODkgZGVmYXVsdFx1RkYwOVxyXG5cdC8vICAgIC0gZXhwb3J0IGRlZmF1bHQgaW50ZXJmYWNlIFggLT4gaW50ZXJmYWNlIFhcclxuXHR0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXGJleHBvcnRcXHMrZGVmYXVsdFxccytpbnRlcmZhY2VcXGIvZywgXCJpbnRlcmZhY2VcIik7XHJcblx0Ly8gICAgLSBleHBvcnQgZGVmYXVsdCBjbGFzcyBYIC0+IGNsYXNzIFhcclxuXHR0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXGJleHBvcnRcXHMrZGVmYXVsdFxccytjbGFzc1xcYi9nLCBcImNsYXNzXCIpO1xyXG5cdC8vICAgIC0gZXhwb3J0IGRlZmF1bHQgdHlwZSBYID0gLi4uIC0+IHR5cGUgWCA9IC4uLlxyXG5cdHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcYmV4cG9ydFxccytkZWZhdWx0XFxzK3R5cGVcXGIvZywgXCJ0eXBlXCIpO1xyXG5cdC8vICAgIC0gZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gWCguLi4pIC0+IGZ1bmN0aW9uIFgoLi4uKVxyXG5cdHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcYmV4cG9ydFxccytkZWZhdWx0XFxzK2Z1bmN0aW9uXFxiL2csIFwiZnVuY3Rpb25cIik7XHJcblx0Ly8gICAgLSBcdTVCRjlcdTRFOEVcdTZDQTFcdTY3MDlcdTU0MERcdTVCNTdcdTc2ODQgZGVmYXVsdFx1RkYwOFx1NUMxMVx1ODlDMVx1NEU4RSAuZC50c1x1RkYwOVx1RkYwQ1x1NzZGNFx1NjNBNVx1NTNCQlx1NjM4OSBkZWZhdWx0XHJcblx0dGV4dCA9IHRleHQucmVwbGFjZSgvXFxiZXhwb3J0XFxzK2RlZmF1bHRcXHMrL2csIFwiXCIpO1xyXG5cclxuXHQvLyA0KSBcdTU5ODJcdTY3OUNcdTVERjJcdTdFQ0ZcdTVCNThcdTU3MjggZGVjbGFyZSBnbG9iYWxcdUZGMENcdTVDMzFcdTRFMERcdTUxOERcdTUzMDVcdTg4RjlcclxuXHRjb25zdCBoYXNEZWNsYXJlR2xvYmFsID0gL2RlY2xhcmVcXHMrZ2xvYmFsXFxzKlxcey8udGVzdCh0ZXh0KTtcclxuXHJcblx0Ly8gNSkgXHU2RTA1XHU3NDA2XHU1OTFBXHU0RjU5XHU3QTdBXHU4ODRDXHJcblx0dGV4dCA9IHRleHRcclxuXHRcdC5zcGxpdCgvXFxyP1xcbi8pXHJcblx0XHQuZmlsdGVyKChsLCBpLCBhcnIpID0+ICEobC50cmltKCkgPT09IFwiXCIgJiYgYXJyW2kgLSAxXT8udHJpbSgpID09PSBcIlwiKSlcclxuXHRcdC5qb2luKFwiXFxuXCIpXHJcblx0XHQudHJpbSgpO1xyXG5cclxuXHQvLyA2KSBcdTUzMDVcdTRFMEEgZGVjbGFyZSBnbG9iYWxcdUZGMDhcdThCQTlcdTVCODNcdTc3MUZcdTZCNjNcdTYyMTBcdTRFM0FcdTUxNjhcdTVDNDBcdTU4RjBcdTY2MEVcdUZGMDlcclxuXHQvLyBpZiAoIWhhc0RlY2xhcmVHbG9iYWwpIHtcclxuXHQvLyBcdC8vIFx1N0YyOVx1OEZEQlx1NEUwMFx1NEUwQlx1NjZGNFx1NTk3RFx1NzcwQlx1RkYwOFx1NTNFRlx1OTAwOVx1RkYwOVxyXG5cdC8vIFx0Y29uc3QgaW5kZW50ZWQgPSB0ZXh0XHJcblx0Ly8gXHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdC8vIFx0XHQubWFwKChsKSA9PiAobC50cmltKCkgPyBcIiAgXCIgKyBsIDogbCkpXHJcblx0Ly8gXHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cdC8vIFx0dGV4dCA9IGBkZWNsYXJlIGdsb2JhbCB7XFxuJHtpbmRlbnRlZH1cXG59XFxuYDtcclxuXHQvLyB9XHJcblxyXG5cdC8vIDcpIFx1Nzg2RVx1NEZERFx1NkNBMVx1NjcwOVx1NTkxQVx1NEY1OVx1NzY4NCBleHBvcnQge30gXHU0RTRCXHU3QzdCXHU2QjhCXHU3NTU5XHJcblx0dGV4dCA9IHRleHQucmVwbGFjZSgvXlxccypleHBvcnRcXHMqXFx7XFxzKlxcfVxccyo7P1xccyokL2dtLCBcIlwiKTtcclxuXHJcblx0cmV0dXJuIHRleHQgKyBcIlxcblwiO1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1YsU0FBUyxvQkFBb0I7QUFDblgsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sY0FBYztBQUNyQixPQUFPQSxXQUFVO0FBQ2pCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsNEJBQTRCOzs7QUNMbVgsT0FBTyxRQUFRO0FBQ3ZhLE9BQU8sVUFBVTtBQUNqQixPQUFPLFFBQVE7QUFDZixTQUFTLHlCQUF5QjtBQUhsQyxJQUFNLG1DQUFtQztBQWExQixTQUFSLG9CQUFxQztBQUUzQyxXQUFTLGdCQUFnQixRQUFnQjtBQUN4QyxVQUFNLFNBQVMsS0FBSyxRQUFRLE1BQU07QUFFbEMsVUFBTSxVQUFVO0FBQUEsTUFDZjtBQUFBLFFBQ0M7QUFBQSxVQUNDLFVBQVU7QUFBQSxVQUNWLFFBQVE7QUFBQSxZQUNQLFVBQVU7QUFBQSxZQUNWLHNCQUFzQjtBQUFBLFVBQ3ZCO0FBQUEsUUFDRDtBQUFBLE1BQ0Q7QUFBQSxNQUNBLEVBQUUscUJBQXFCLEtBQUssUUFBUSxrQ0FBVyx3QkFBd0IsRUFBRTtBQUFBLElBQzFFO0FBRUEsVUFBTSxhQUFhLEtBQUssS0FBSyxRQUFRLEtBQUssU0FBUyxRQUFRLEtBQUssUUFBUSxNQUFNLENBQUMsSUFBSSxPQUFPO0FBRTFGLFVBQU0sZ0JBQWdCLFlBQVksUUFBUSxDQUFDLENBQUM7QUFFNUMsT0FBRyxjQUFjLFlBQVksZUFBZSxNQUFNO0FBQ2xELFlBQVE7QUFBQSxNQUNQLDJCQUEyQixLQUFLLFNBQVMsUUFBUSxJQUFJLEdBQUcsTUFBTSxNQUFNLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFBQSxJQUNoRztBQUFBLEVBQ0Q7QUFHQSxXQUFTLGtCQUFrQjtBQUMxQixhQUFTLEtBQUssS0FBYTtBQUMxQixZQUFNLFFBQVEsR0FBRyxZQUFZLEtBQUssRUFBRSxlQUFlLEtBQUssQ0FBQztBQUN6RCxpQkFBVyxRQUFRLE9BQU87QUFDekIsY0FBTSxXQUFXLEtBQUssS0FBSyxLQUFLLEtBQUssSUFBSTtBQUN6QyxZQUFJLEtBQUssWUFBWSxHQUFHO0FBQ3ZCLGVBQUssUUFBUTtBQUFBLFFBQ2QsV0FBVyxLQUFLLE9BQU8sS0FBSyxLQUFLLEtBQUssU0FBUyxLQUFLLEdBQUc7QUFDdEQsZ0JBQU0sVUFBVSxHQUFHLGFBQWEsVUFBVSxPQUFPO0FBQ2pELGNBQUksUUFBUSxXQUFXLGtCQUFrQixHQUFHO0FBQzNDLDRCQUFnQixRQUFRO0FBQUEsVUFDekI7QUFBQSxRQUNEO0FBQUEsTUFDRDtBQUFBLElBQ0Q7QUFDQSxTQUFLLEtBQUssUUFBUSxRQUFRLElBQUksR0FBRyxPQUFPLENBQUM7QUFBQSxFQUMxQztBQUVBLFNBQU87QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGFBQWE7QUFDWixzQkFBZ0I7QUFBQSxJQUNqQjtBQUFBLElBQ0EsZ0JBQWdCLFFBQWE7QUFDNUIsYUFBTyxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQWM7QUFDMUMsWUFBSSxLQUFLLFNBQVMsS0FBSyxHQUFHO0FBQ3pCLGdCQUFNLFVBQVUsR0FBRyxhQUFhLE1BQU0sT0FBTztBQUM3QyxjQUFJLFFBQVEsV0FBVyxrQkFBa0IsR0FBRztBQUMzQyxvQkFBUSxJQUFJLHlCQUF5QixNQUFNO0FBQzNDLDRCQUFnQixJQUFJO0FBQUEsVUFDckI7QUFBQSxRQUNEO0FBQUEsTUFDRCxDQUFDO0FBQUEsSUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUQ7QUFDRDtBQUVBLFNBQVMsWUFBWSxnQkFBZ0M7QUFDcEQsTUFBSSxPQUFPO0FBR1gsU0FBTyxLQUFLLFFBQVEsd0NBQXdDLEVBQUU7QUFDOUQsU0FBTyxLQUFLLFFBQVEsd0JBQXdCLEVBQUU7QUFHOUMsU0FBTyxLQUFLLFFBQVEseUJBQXlCLFNBQVM7QUFDdEQsU0FBTyxLQUFLLFFBQVEseUVBQXlFLElBQUk7QUFJakcsU0FBTyxLQUFLLFFBQVEscUNBQXFDLFdBQVc7QUFFcEUsU0FBTyxLQUFLLFFBQVEsaUNBQWlDLE9BQU87QUFFNUQsU0FBTyxLQUFLLFFBQVEsZ0NBQWdDLE1BQU07QUFFMUQsU0FBTyxLQUFLLFFBQVEsb0NBQW9DLFVBQVU7QUFFbEUsU0FBTyxLQUFLLFFBQVEsMEJBQTBCLEVBQUU7QUFHaEQsUUFBTSxtQkFBbUIsd0JBQXdCLEtBQUssSUFBSTtBQUcxRCxTQUFPLEtBQ0wsTUFBTSxPQUFPLEVBQ2IsT0FBTyxDQUFDLEdBQUcsR0FBRyxRQUFLO0FBL0d0QjtBQStHeUIsYUFBRSxFQUFFLEtBQUssTUFBTSxRQUFNLFNBQUksSUFBSSxDQUFDLE1BQVQsbUJBQVksWUFBVztBQUFBLEdBQUcsRUFDckUsS0FBSyxJQUFJLEVBQ1QsS0FBSztBQWFQLFNBQU8sS0FBSyxRQUFRLG1DQUFtQyxFQUFFO0FBRXpELFNBQU8sT0FBTztBQUNmOzs7QURqSUEsSUFBTUMsb0NBQW1DO0FBVXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLFNBQVM7QUFBQSxJQUNSLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBUUosa0JBQWtCO0FBQUEsSUFDbEIsV0FBVztBQUFBLE1BQ1YsV0FBVztBQUFBLFFBQ1YscUJBQXFCO0FBQUEsVUFDcEIsYUFBYTtBQUFBO0FBQUEsUUFDZCxDQUFDO0FBQUEsTUFDRjtBQUFBLE1BQ0EsS0FBSztBQUFBLElBQ04sQ0FBQztBQUFBLElBQ0QsU0FBUztBQUFBLE1BQ1IsTUFBTTtBQUFBLFFBQ0wsT0FBTztBQUFBLE1BQ1I7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNSLE9BQU9DLE1BQUssS0FBS0MsbUNBQVcscUJBQXFCO0FBQUEsTUFDbEQ7QUFBQSxNQUNBLFVBQVUsUUFBUSxJQUFJLGFBQWEsU0FBUyxTQUFZLENBQUM7QUFBQSxJQUMxRCxDQUFDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLE9BQU87QUFBQSxNQUNOO0FBQUEsUUFDQyxNQUFNO0FBQUEsUUFDTixhQUFhRCxNQUFLLFFBQVFBLE1BQUssUUFBUSxJQUFJLEdBQUcsS0FBSztBQUFBLE1BQ3BEO0FBQUEsSUFDRDtBQUFBLEVBQ0Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNQLFFBQVE7QUFBQTtBQUFBLEVBQ1Q7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lIiwgInBhdGgiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUiXQp9Cg==
