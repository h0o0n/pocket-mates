import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 앱인토스 웹 미니앱 진입점
 * - TDSMobileAITProvider: TDS 컴포넌트·브랜드 컬러 주입
 * - brandPrimaryColor: apps-in-toss.config.ts 의 primaryColor와 동일하게 유지
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <App />
    </TDSMobileAITProvider>
  </StrictMode>,
)
