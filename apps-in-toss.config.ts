import { defineConfig } from '@apps-in-toss/web-framework/config';

/**
 * 앱인토스 SDK 3.x 설정
 * - appName: 콘솔에 등록한 값과 동일해야 합니다.
 * - webBundleDir: Vite 빌드 산출물 경로(프로젝트 루트 기준)
 */
export default defineConfig({
  appName: 'pocket-mates',
  brand: {
    primaryColor: '#3182F6',
  },
  webView: {
    // 가계부 UI는 세로 스크롤이 많아 기본 바운스를 끕니다.
    bounces: false,
    pullToRefreshEnabled: false,
  },
  permissions: [],
  webBundleDir: 'web/dist',
});
