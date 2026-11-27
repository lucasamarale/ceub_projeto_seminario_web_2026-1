import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O CSS do Materialize traz um caractere invisível (BOM) no meio do arquivo, que o minificador de CSS recusa.
// Este plugin tira o caractere antes de o CSS ser processado.
const semBom = () => ({
  name: "ciranda-sem-bom",
  enforce: "pre",
  transform(codigo, id) {
    return id.split("?")[0].endsWith(".css") && codigo.includes("\uFEFF") ? { code: codigo.replaceAll("\uFEFF", ""), map: null } : null;
  },
});

export default defineConfig({
  plugins: [react(), semBom()],
  // Em desenvolvimento, /api vai para o backend local. Assim o navegador fala com uma origem só.
  server: { port: 5173, proxy: { "/api": "http://localhost:3333" } },
  preview: { port: 4173, strictPort: true, proxy: { "/api": "http://localhost:3333" } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/teste/preparar.js",
    css: false,
    include: ["src/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/main.jsx", "src/teste/**", "src/**/*.test.{js,jsx}"],
      reporter: ["text", "text-summary", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
