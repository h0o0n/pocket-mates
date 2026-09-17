/**
 * 인앱 광고 그룹 ID
 * - 개발/QR: 문서 테스트 ID (실 ID로 테스트하면 정책 위반)
 * - 출시: .env 에 콘솔 ID 설정
 */
export const REWARDED_AD_GROUP_ID =
  (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string | undefined)?.trim()
  || 'ait-ad-test-rewarded-id'

/** 리스트형 배너 (홈·꾸미기) */
export const BANNER_AD_GROUP_ID =
  (import.meta.env.VITE_BANNER_AD_GROUP_ID as string | undefined)?.trim()
  || 'ait-ad-test-banner-id'

/** 광고 1회 시청 완료 시 지급할 냠 */
export const REWARD_NYAM_PER_AD = 100
