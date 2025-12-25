// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\erick\\Desktop\\Futbol";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      lib: {
        entry: "electron/main/index.ts"
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      lib: {
        entry: "electron/preload/index.ts"
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: "src",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/index.html")
        }
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
