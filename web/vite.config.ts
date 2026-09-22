import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import aitDevtools from "@apps-in-toss/devtools/unplugin";
import { readFileSync } from "node:fs";

const rootPackage = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

/**
 * 앱인토스 WebView 배포용 Vite 설정
 * - base './': 상대 경로로 정적 자산을 불러와 미니앱 번들에서 깨지지 않게 합니다.
 * - aitDevtools: 로컬 브라우저에서 토스 SDK(로그인 등)를 모킹합니다.
 */
export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  plugins: [aitDevtools.vite(), react()],
});
