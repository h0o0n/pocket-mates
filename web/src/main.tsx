import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * iOS Safari/WebView 핀치·더블탭 줌 제스처 차단 (비게임 UX 가이드).
 * viewport user-scalable=no 와 함께 사용합니다.
 */
const blockPinchZoom = (event: Event) => {
  event.preventDefault()
}
document.addEventListener('gesturestart', blockPinchZoom, { passive: false })
document.addEventListener('gesturechange', blockPinchZoom, { passive: false })
document.addEventListener('gestureend', blockPinchZoom, { passive: false })

// 첫 페인트 전 기본 테마(하늘) — 유저 저장값은 App에서 덮어씀
if (!document.documentElement.getAttribute('data-theme')) {
  document.documentElement.setAttribute('data-theme', 'sky')
}

/**
 * 앱인토스 웹 미니앱 진입점
 * - UI 테마(핑크/연두/하늘)는 App의 TDSMobileAITProvider brandPrimaryColor 로 버튼까지 맞춤
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
