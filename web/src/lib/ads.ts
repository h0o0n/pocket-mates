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

/** 하루 리워드 광고 최대 시청 횟수 */
export const REWARD_AD_DAILY_LIMIT = 3

/** 리워드 광고 연속 시청 사이 최소 간격 (ms) */
export const REWARD_AD_COOLDOWN_MS = 5_000

/** 남은 쿨다운을 초 단위로 (0이면 시청 가능). */
export const rewardAdCooldownRemainingSec = (lastWatchedAtMs: number, nowMs = Date.now()) =>
  Math.max(0, Math.ceil((lastWatchedAtMs + REWARD_AD_COOLDOWN_MS - nowMs) / 1000))