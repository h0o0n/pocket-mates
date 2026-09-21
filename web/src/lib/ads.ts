/**
 * 인앱 광고 그룹 ID
 *
 * 출시 검수는 실제로 호출하는 ID가 아니라 번들 안의 문자열을 검사합니다.
 * 테스트 ID를 라이브 ID와 같은 함수 인자로 넘기면, 실행되지 않아도
 * `ait-ad-test-*`가 JS에 남아 거절됩니다.
 * `import.meta.env.DEV` 분기 안에만 테스트 ID를 두어 출시 빌드에서 그 분기를 삭제합니다.
 * 로컬 `vite dev`에서 실 ID를 쓰면 정책 위반입니다.
 */

/** 리워드형 광고. 라이브: ait.v2.live.b1a86b7ff7be433c */
export const REWARDED_AD_GROUP_ID = import.meta.env.DEV
  ? (import.meta.env.VITE_REWARDED_AD_GROUP_ID?.trim() || 'ait-ad-test-rewarded-id')
  : (import.meta.env.VITE_REWARDED_AD_GROUP_ID?.trim() || 'ait.v2.live.b1a86b7ff7be433c')

/** 리스트형 배너 (홈·꾸미기). 라이브: ait.v2.live.57ffb0d441d94b78 */
export const BANNER_AD_GROUP_ID = import.meta.env.DEV
  ? (import.meta.env.VITE_BANNER_AD_GROUP_ID?.trim() || 'ait-ad-test-banner-id')
  : (import.meta.env.VITE_BANNER_AD_GROUP_ID?.trim() || 'ait.v2.live.57ffb0d441d94b78')

/** 광고 1회 시청 완료 시 지급할 냠 */
export const REWARD_NYAM_PER_AD = 100

/** 하루 리워드 광고 최대 시청 횟수 */
export const REWARD_AD_DAILY_LIMIT = 3

/** 리워드 광고 연속 시청 사이 최소 간격 (ms) */
export const REWARD_AD_COOLDOWN_MS = 5_000

/** 남은 쿨다운을 초 단위로 (0이면 시청 가능). */
export const rewardAdCooldownRemainingSec = (lastWatchedAtMs: number, nowMs = Date.now()) =>
  Math.max(0, Math.ceil((lastWatchedAtMs + REWARD_AD_COOLDOWN_MS - nowMs) / 1000))