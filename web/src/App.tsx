import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework'
import { Button, BottomSheet, ListHeader, ListRow, TextField } from '@toss/tds-mobile'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { calculateMonthlyBudget, createExpenseReaction, filterExpensesByMonth } from './domain/index.ts'
import type { BudgetPlan, Expense, ExpenseCategory } from './domain/types.ts'
import {
  REWARD_AD_DAILY_LIMIT,
  REWARD_NYAM_PER_AD,
  REWARDED_AD_GROUP_ID,
  rewardAdCooldownRemainingSec,
} from './lib/ads.ts'
import { BannerAdSlot } from './components/BannerAdSlot.tsx'
import { createPersonalBackup, restorePersonalBackup } from './lib/cloudBackup.ts'
import { ensureAnonymousSession, isSupabaseConfigured } from './lib/supabase.ts'
import { acceptMateInvite, completeMateDailyMission, createMateRoom, leaveMateRoom, loadDailyMateMission, loadMateActivity, loadMateRoom, sendMateReactionToRoom, syncMateAvatar, syncMateDay, updateMateRoomTheme, type DailyMateMission, type SharedMateAvatar, type SharedThemeProgress } from './lib/mateRoom.ts'
import {
  loadJson,
  migrateLegacyKeys,
  resolveUserHash,
  saveJson,
  scopedKey,
} from './lib/userStorage.ts'

/** 재화 표시 — 🍪 + N냠 */
const NyamAmount = ({ amount, suffix = '냠' }: { amount: number; suffix?: string }) => (
  <span className="nyam-amount" aria-label={`${amount}${suffix}`}>
    <span className="nyam-icon" aria-hidden="true">🍪</span>
    <span>{amount}{suffix}</span>
  </span>
)

const defaultPlan: BudgetPlan = { monthlyIncome: 3_000_000, fixedExpenses: 1_000_000, savingsGoal: 500_000 }
const categories: Array<{ value: ExpenseCategory; label: string; emoji: string }> = [
  { value: 'coffee', label: '카페·커피', emoji: '☕' }, { value: 'delivery', label: '배달', emoji: '🍕' },
  { value: 'dining', label: '외식', emoji: '🍚' }, { value: 'transport', label: '교통', emoji: '🚌' },
  { value: 'shopping', label: '쇼핑', emoji: '📦' }, { value: 'game', label: '게임', emoji: '🎮' },
  { value: 'subscription', label: '구독', emoji: '📺' }, { value: 'living', label: '생활', emoji: '🧻' },
  { value: 'other', label: '기타', emoji: '✏️' },
]
const copy = {
  relaxed: ['평화로워요', '이번 달은 아직 창밖을 볼 여유가 있어요.'],
  watching: ['슬슬 보는 중', '방금 그 결제, 꼭 필요했던 거 맞아요?'],
  calculating: ['계산기 등장', '눈찌가 영수증을 모으기 시작했어요.'],
  worried: ['집안 사정 회의', '전등 하나 끄면 해결되는 문제일까요.'],
  speechless: ['할 말이 없어요', '눈찌와 방이 같이 낡아가고 있어요.'],
} as const

/** v0.6 스타일: 잔액에 따라 기본 다락방 일러스트가 바뀝니다. */
const roomImages = {
  relaxed: '/assets/rooms/budget-states/attic-cozy.png',
  watching: '/assets/rooms/budget-states/attic-lived-in.png',
  calculating: '/assets/rooms/budget-states/attic-worn.png',
  worried: '/assets/rooms/budget-states/attic-struggling.png',
  speechless: '/assets/rooms/budget-states/attic-broke.png',
} as const

type SkinId = 'attic' | 'cafe' | 'beach'
type OutfitId =
  | 'none' | 'scarf' | 'sweater' | 'raincoat'
  | 'bear-gingham-bib' | 'bear-honey-cape' | 'bear-cook-apron'
  | 'raccoon-courier-vest' | 'raccoon-navy-hoodie' | 'raccoon-coral-satchel'
  | 'seal-sailor-collar' | 'seal-lavender-sleep' | 'seal-mint-headphones'
/** 기본 눈찌 + 소비 유형 컴패니언 3종 */
type CompanionId = 'nunchi' | 'foodie' | 'shopper' | 'subscriber'
/** 설문으로 고르는 소비 유형 (눈찌 제외) */
type SpendingType = Exclude<CompanionId, 'nunchi'>
/** 맨몸·옷 공통으로 준비해야 하는 캐릭터 상태 PNG 키 (guide.md §1) */
type DogVisualState = 'neutral' | 'chubby' | 'very-chubby' | 'receipt' | 'eating'
type ListPeriod = 'weekly' | 'monthly' | 'yearly'
type OnboardingStep = 'survey' | 'result' | 'name'
/** 전체 UI 파스텔 테마 (버튼·탭·강조색 포함) */
type ThemeId = 'pink' | 'mint' | 'sky'
type MateReaction = '잘 참는 중' | '눈찌가 보고 있다' | '오늘도 같이 가자'
type MateTheme = 'christmas' | 'camping'

interface MateRoomState {
  roomId: string | null
  inviteCode: string
  mateName: string | null
  mateAvatar: SharedMateAvatar | null
  mateSpentToday: number
  shareDetails: boolean
  mateRecentExpenses: Array<{ category: ExpenseCategory; amount: number; memo: string }>
  mateCategoryTotals: Record<string, number>
  reactions: Array<{ id: string; from: 'me' | 'mate'; text: MateReaction; createdAt: string }>
  sharedNyam: number
  theme: MateTheme
  successDays: number
  roomLevel: number
  themeProgress: SharedThemeProgress
}

const DAILY_MATE_LIMIT = 15_000
const mateReactions: MateReaction[] = ['잘 참는 중', '눈찌가 보고 있다', '오늘도 같이 가자']
const defaultMateRoom: MateRoomState = {
  roomId: null,
  inviteCode: '',
  mateName: null,
  mateAvatar: null,
  mateSpentToday: 0,
  shareDetails: true,
  mateRecentExpenses: [],
  mateCategoryTotals: {},
  reactions: [],
  sharedNyam: 0,
  theme: 'christmas',
  successDays: 0,
  roomLevel: 1,
  themeProgress: {
    christmas: { successDays: 0, roomLevel: 1 },
    camping: { successDays: 0, roomLevel: 1 },
  },
}

const THEME_OPTIONS: Array<{ id: ThemeId; label: string; primary: string }> = [
  { id: 'pink', label: '핑크', primary: '#E891B8' },
  { id: 'mint', label: '연두', primary: '#7CB896' },
  { id: 'sky', label: '하늘', primary: '#7EB8E8' },
]

const isThemeId = (value: unknown): value is ThemeId =>
  value === 'pink' || value === 'mint' || value === 'sky'

/** 맨몸 상태 경로 — 기본 눈찌 / 옷 없을 때 */
const baseDogStates: Record<DogVisualState, string> = {
  neutral: '/assets/characters/states/dog-neutral.png',
  chubby: '/assets/characters/states/dog-chubby.png',
  'very-chubby': '/assets/characters/states/dog-very-chubby.png',
  receipt: '/assets/characters/states/dog-receipt.png',
  eating: '/assets/characters/states/dog-eating.png',
}

/** 소비 유형 id → 동물 영문 접두사 (파일명과 동일) */
const COMPANION_ANIMAL_PREFIX: Record<SpendingType, string> = {
  foodie: 'bear',
  shopper: 'raccoon',
  subscriber: 'seal',
}

/** 소비 유형 컴패니언 5상태 경로 (companions/{id}/{animal}-*.png) */
const companionDogStates = (id: SpendingType): Record<DogVisualState, string> => {
  const animal = COMPANION_ANIMAL_PREFIX[id]
  return {
    neutral: `/assets/characters/companions/${id}/${animal}-neutral.png`,
    chubby: `/assets/characters/companions/${id}/${animal}-chubby.png`,
    'very-chubby': `/assets/characters/companions/${id}/${animal}-very-chubby.png`,
    receipt: `/assets/characters/companions/${id}/${animal}-receipt.png`,
    eating: `/assets/characters/companions/${id}/${animal}-eating.png`,
  }
}

/** 컴패니언 메타 — 이름(유저) + 칭호(유형 역할) */
const companions: Array<{
  id: CompanionId
  /** 역할 칭호 */
  title: string
  spendingType: SpendingType | null
  tagline: string
  states: Record<DogVisualState, string>
}> = [
  {
    id: 'nunchi',
    title: '잔액지킴이',
    spendingType: null,
    tagline: '강아지 눈찌. 잔액을 흘깃 봐요.',
    states: baseDogStates,
  },
  {
    id: 'foodie',
    title: '심야출출대장',
    spendingType: 'foodie',
    tagline: '곰 눈찌. 배달·야식이 제일 먼저 떠올라요.',
    states: companionDogStates('foodie'),
  },
  {
    id: 'shopper',
    title: '박스뜯기마니아',
    spendingType: 'shopper',
    tagline: '너구리 눈찌. 택배 소리에 귀가 먼저 반응해요.',
    states: companionDogStates('shopper'),
  },
  {
    id: 'subscriber',
    title: '구독깜빡이',
    spendingType: 'subscriber',
    tagline: '물개 눈찌. 가만히 있어도 돈이 빠져나가요.',
    states: companionDogStates('subscriber'),
  },
]

const DEFAULT_COMPANION_NAME = '눈찌'
const COMPANION_NAME_MAX = 8

/**
 * 설문으로 고른 눈찌 외 해금 가격.
 * 리워드 광고 일일 한도(3회×100냠) × 7일 ≈ 일주일 모으면 살 수 있는 분량.
 */
const COMPANION_UNLOCK_PRICE = REWARD_NYAM_PER_AD * REWARD_AD_DAILY_LIMIT * 7

/** 화면용: {이름} · {칭호} */
const nunchiCallsign = (name: string, title: string) => `${name} · ${title}`

/**
 * 보유 눈찌 목록 로드.
 * - 기본 눈찌(잔액지킴이/강아지)는 항상 지급
 * - 설문·구매로 얻은 유형도 합침
 */
const loadOwnedCompanions = (
  k: (suffix: string) => string,
): CompanionId[] => {
  const seed = new Set<CompanionId>(['nunchi'])
  const saved = loadJson<CompanionId[] | null>(k('owned-companions'), null)
  if (Array.isArray(saved)) {
    for (const id of saved) seed.add(id)
  }
  const current = loadJson<CompanionId>(k('companion-id'), 'nunchi')
  seed.add(current)
  const survey = loadJson<SpendingType | null>(k('spending-type'), null)
  if (survey) seed.add(survey)
  return [...seed]
}

/** 온보딩 이름 — 비우면 눈찌, 앞뒤 공백 제거·길이 제한 */
const normalizeCompanionName = (raw: string) => {
  const trimmed = raw.trim().slice(0, COMPANION_NAME_MAX)
  return trimmed || DEFAULT_COMPANION_NAME
}

/**
 * 온보딩 설문 — 심리테스트형 6문항 × 3선택.
 * 배달/외식만 눈에 띄지 않게, 기분·습관·충동 질문으로 유형을 고르게 분산.
 */
const onboardingQuestions: Array<{
  id: string
  prompt: string
  options: Array<{ label: string; type: SpendingType }>
}> = [
  {
    id: 'comfort',
    prompt: '힘든 하루의 끝을 스스로 위로하는 방식은?',
    options: [
      { label: '따뜻한 걸로 배를 채운다', type: 'foodie' },
      { label: '사고 싶던 걸 장바구니에 담는다', type: 'shopper' },
      { label: '조용한 콘텐츠·앱에 빠진다', type: 'subscriber' },
    ],
  },
  {
    id: 'impulse',
    prompt: '“이번만…” 하며 가장 자주 무너지는 순간은?',
    options: [
      { label: '배고픈데 요리하기 싫을 때', type: 'foodie' },
      { label: '할인·무료배송 타이머가 돌 때', type: 'shopper' },
      { label: '무료 체험이 끝나기 직전일 때', type: 'subscriber' },
    ],
  },
  {
    id: 'joy',
    prompt: '알림이 울렸을 때 제일 설레는 문구는?',
    options: [
      { label: '곧 도착해요 / 픽업 준비됐어요', type: 'foodie' },
      { label: '택배가 배송을 시작했어요', type: 'shopper' },
      { label: '이번 달에도 이용 중이에요', type: 'subscriber' },
    ],
  },
  {
    id: 'weekend',
    prompt: '주말에 남는 에너지가 있다면 어디에 쓰나요?',
    options: [
      { label: '맛집·카페·야식 코스 짜기', type: 'foodie' },
      { label: '서랍·옷장·방을 새로 꾸미기', type: 'shopper' },
      { label: '밀린 시리즈·플레이리스트 정주행', type: 'subscriber' },
    ],
  },
  {
    id: 'regret',
    prompt: '카드 명세를 보며 “또…” 하는 항목은?',
    options: [
      { label: '외식·카페·간식 합계', type: 'foodie' },
      { label: '생활용품·패션·소품', type: 'shopper' },
      { label: '기억도 안 나는 자동결제', type: 'subscriber' },
    ],
  },
  {
    id: 'personality',
    prompt: '친구들이 말하는 나의 소비 캐릭터는?',
    options: [
      { label: '배고프면 이성이 잠시 꺼져요', type: 'foodie' },
      { label: '소유욕이 힐링이에요', type: 'shopper' },
      { label: '한 번 켜두면 잘 안 끄죠', type: 'subscriber' },
    ],
  },
]

/**
 * 설문으로 만날 수 있는 눈찌만 (기본 잔액지킴이/강아지 제외).
 * 설문 결과·해금은 이 목록에만 해당합니다.
 */
const surveyCompanions = companions.filter(
  (mate): mate is typeof companions[number] & { id: SpendingType } => mate.spendingType != null,
)

/**
 * 설문 답안 → 다수결 소비 유형.
 * 동점이면 처음에 고른 유형을 우선 (직감 쪽) — foodie로 몰지 않음.
 * 기본 눈찌(nunchi)는 절대 반환하지 않음.
 */
const scoreSpendingType = (answers: SpendingType[]): SpendingType => {
  const tallies: Record<SpendingType, number> = { foodie: 0, shopper: 0, subscriber: 0 }
  for (const answer of answers) {
    if (answer === 'foodie' || answer === 'shopper' || answer === 'subscriber') {
      tallies[answer] += 1
    }
  }
  const max = Math.max(tallies.foodie, tallies.shopper, tallies.subscriber)
  const winners = (Object.keys(tallies) as SpendingType[]).filter(type => tallies[type] === max)
  if (winners.length === 1) return winners[0]!
  for (const answer of answers) {
    if (winners.includes(answer)) return answer
  }
  return 'shopper'
}

/** 옷 1벌의 상태 5장 경로 (characters/guide.md 규칙) */
const outfitDogStates = (outfitId: Exclude<OutfitId, 'none'>): Record<DogVisualState, string> => ({
  neutral: `/assets/characters/states/dog-neutral-${outfitId}.png`,
  chubby: `/assets/characters/states/dog-chubby-${outfitId}.png`,
  'very-chubby': `/assets/characters/states/dog-very-chubby-${outfitId}.png`,
  receipt: `/assets/characters/states/dog-receipt-${outfitId}.png`,
  eating: `/assets/characters/states/dog-eating-${outfitId}.png`,
})

const companionOutfitStates = (
  companionId: Exclude<CompanionId, 'nunchi'>,
  animal: 'bear' | 'raccoon' | 'seal',
  outfitId: string,
): Record<DogVisualState, string> => ({
  neutral: `/assets/characters/companions/${companionId}/outfits/${outfitId}/${animal}-neutral.png`,
  chubby: `/assets/characters/companions/${companionId}/outfits/${outfitId}/${animal}-chubby.png`,
  'very-chubby': `/assets/characters/companions/${companionId}/outfits/${outfitId}/${animal}-very-chubby.png`,
  receipt: `/assets/characters/companions/${companionId}/outfits/${outfitId}/${animal}-receipt.png`,
  eating: `/assets/characters/companions/${companionId}/outfits/${outfitId}/${animal}-eating.png`,
})

const roomSkins: Array<{ id: SkinId; name: string; description: string; price: number; image: string }> = [
  { id: 'attic', name: '다락방', description: '기본 지급 · 잔액에 따라 제대로 낡아갑니다.', price: 0, image: '/assets/rooms/budget-states/attic-cozy.png' },
  { id: 'cafe', name: '골목 카페', description: '커피값 영수증이 쌓이기 좋은 방', price: 300, image: '/assets/rooms/skins/cafe-corner.png' },
  { id: 'beach', name: '바다 오두막', description: '파도 소리만 결제 알림보다 큰 방', price: 450, image: '/assets/rooms/skins/beach-cabin.png' },
]

const isSkinId = (value: unknown): value is SkinId =>
  typeof value === 'string' && roomSkins.some(skin => skin.id === value)

/** 삭제된 스킨(구름방 등)을 보유·장착 중이어도 다락방으로 정리 */
const sanitizeSkinInventory = (raw: unknown): SkinId[] => {
  const list = Array.isArray(raw) ? raw.filter(isSkinId) : []
  return [...new Set<SkinId>(['attic', ...list])]
}

const sanitizeEquippedSkin = (raw: unknown): SkinId =>
  (isSkinId(raw) ? raw : 'attic')

/**
 * 캐릭터 코스튬 — 통짜 PNG 교체.
 * states가 null이면 현재 눈찌의 맨몸 상태맵, 있으면 해당 눈찌 옷의 5상태를 사용합니다.
 */
const characterOutfits: Array<{
  id: OutfitId
  companionId: CompanionId | null
  name: string
  description: string
  price: number
  /** 상점 썸네일 (보통 neutral과 동일) */
  image: string | null
  states: Record<DogVisualState, string> | null
}> = [
  { id: 'none', companionId: null, name: '맨몸', description: '기본 지급 · 아무것도 안 입은 상태', price: 0, image: null, states: null },
  { id: 'scarf', companionId: 'nunchi', name: '빨간 목도리', description: '추울 때 잔액도 같이 따뜻해 보이는 목도리', price: 120, image: '/assets/characters/outfits/scarf.png', states: outfitDogStates('scarf') },
  { id: 'sweater', companionId: 'nunchi', name: '니트 스웨터', description: '통통한 배가 더 티 나는 따뜻한 니트', price: 180, image: '/assets/characters/outfits/sweater.png', states: outfitDogStates('sweater') },
  { id: 'raincoat', companionId: 'nunchi', name: '하늘색 우비', description: '비 오는 날 충동구매를 막아 줄지도 모르는 우비', price: 220, image: '/assets/characters/outfits/raincoat.png', states: outfitDogStates('raincoat') },
  { id: 'bear-gingham-bib', companionId: 'foodie', name: '체크 턱받이', description: '먹보곰의 간식 시간을 위한 빨간 체크 턱받이', price: 140, image: '/assets/characters/companions/foodie/outfits/gingham-bib/bear-neutral.png', states: companionOutfitStates('foodie', 'bear', 'gingham-bib') },
  { id: 'bear-honey-cape', companionId: 'foodie', name: '꿀단지 망토', description: '꿀 냄새를 따라갈 때 입는 노란 후드 망토', price: 190, image: '/assets/characters/companions/foodie/outfits/honey-cape/bear-neutral.png', states: companionOutfitStates('foodie', 'bear', 'honey-cape') },
  { id: 'bear-cook-apron', companionId: 'foodie', name: '간식 요리사', description: '먹기 전에 직접 만드는 척하는 앞치마', price: 230, image: '/assets/characters/companions/foodie/outfits/cook-apron/bear-neutral.png', states: companionOutfitStates('foodie', 'bear', 'cook-apron') },
  { id: 'raccoon-courier-vest', companionId: 'shopper', name: '택배 대장', description: '택배 상자를 누구보다 먼저 발견하는 조끼', price: 160, image: '/assets/characters/companions/shopper/outfits/courier-vest/raccoon-neutral.png', states: companionOutfitStates('shopper', 'raccoon', 'courier-vest') },
  { id: 'raccoon-navy-hoodie', companionId: 'shopper', name: '새벽 쇼핑 후드', description: '장바구니를 조용히 채우기 좋은 남색 후드', price: 210, image: '/assets/characters/companions/shopper/outfits/navy-hoodie/raccoon-neutral.png', states: companionOutfitStates('shopper', 'raccoon', 'navy-hoodie') },
  { id: 'raccoon-coral-satchel', companionId: 'shopper', name: '득템 크로스백', description: '세일 알림을 담아 다니는 산호색 가방', price: 240, image: '/assets/characters/companions/shopper/outfits/coral-satchel/raccoon-neutral.png', states: companionOutfitStates('shopper', 'raccoon', 'coral-satchel') },
  { id: 'seal-sailor-collar', companionId: 'subscriber', name: '구독 항해단', description: '자동결제의 바다를 건너는 세일러 옷', price: 140, image: '/assets/characters/companions/subscriber/outfits/sailor-collar/seal-neutral.png', states: companionOutfitStates('subscriber', 'seal', 'sailor-collar') },
  { id: 'seal-lavender-sleep', companionId: 'subscriber', name: '무료체험 잠옷', description: '해지일을 잊고 편히 자는 보랏빛 잠옷', price: 180, image: '/assets/characters/companions/subscriber/outfits/lavender-sleep/seal-neutral.png', states: companionOutfitStates('subscriber', 'seal', 'lavender-sleep') },
  { id: 'seal-mint-headphones', companionId: 'subscriber', name: '정주행 헤드폰', description: '구독 콘텐츠를 끝까지 보는 민트 헤드폰', price: 220, image: '/assets/characters/companions/subscriber/outfits/mint-headphones/seal-neutral.png', states: companionOutfitStates('subscriber', 'seal', 'mint-headphones') },
]

/**
 * 방 소품
 * - 기본: 소비 기록만으로 쌓임 (구매 불필요)
 * - 추가: 꾸미기에서 냠으로 사면, 같은 소비 기록 때 풀에 섞여 더 다양하게 쌓임
 */
type PropId =
  | 'food-chicken'
  | 'food-cafe'
  | 'food-late-night'
  | 'food-christmas-sweets'
  | 'food-camp-mochi'
  | 'parcel-christmas'
  | 'parcel-camping'

type PropKind = 'food' | 'parcel'

/** 기본 음식 소품 — 카페·배달·외식 기록 시 항상 후보 */
const BASE_FOOD_PROP_IMAGES = [
  '/assets/props/food/delivery-clutter.png',
] as const

/** 기본 택배 소품 — 쇼핑 기록 시 항상 쌓임 */
const BASE_PARCEL_PROP_IMAGES = [
  '/assets/props/shopping/shopping-boxes.png',
] as const

/** 꾸미기에서 파는 추가 소품 (개인 방 소비 누적 풀에 합류) */
const roomDecorProps: Array<{
  id: PropId
  kind: PropKind
  name: string
  description: string
  price: number
  image: string
}> = [
  {
    id: 'food-chicken',
    kind: 'food',
    name: '치킨',
    description: '식비 기록 시 랜덤으로 나와요.',
    price: 80,
    image: '/assets/props/food/food-chicken.png',
  },
  {
    id: 'food-cafe',
    kind: 'food',
    name: '카페 음료',
    description: '식비 기록 시 랜덤으로 나와요.',
    price: 70,
    image: '/assets/props/food/food-cafe.png',
  },
  {
    id: 'food-late-night',
    kind: 'food',
    name: '야식',
    description: '식비 기록 시 랜덤으로 나와요.',
    price: 90,
    image: '/assets/props/food/food-late-night.png',
  },
  {
    id: 'food-christmas-sweets',
    kind: 'food',
    name: '크리스마스 디저트',
    description: '식비 기록 시 랜덤으로 나와요.',
    price: 120,
    image: '/assets/rooms/shared/christmas/food.png',
  },
  {
    id: 'food-camp-mochi',
    kind: 'food',
    name: '모찌 꼬치',
    description: '식비 기록 시 랜덤으로 나와요.',
    price: 110,
    image: '/assets/rooms/shared/camping/food.png',
  },
  {
    id: 'parcel-christmas',
    kind: 'parcel',
    name: '크리스마스 상자',
    description: '쇼핑 기록 시 랜덤으로 나와요.',
    price: 130,
    image: '/assets/rooms/shared/christmas/shopping.png',
  },
  {
    id: 'parcel-camping',
    kind: 'parcel',
    name: '캠핑 가방',
    description: '쇼핑 기록 시 랜덤으로 나와요.',
    price: 120,
    image: '/assets/rooms/shared/camping/shopping.png',
  },
]

const isPropId = (value: unknown): value is PropId =>
  typeof value === 'string' && roomDecorProps.some(prop => prop.id === value)

const sanitizePropList = (raw: unknown): PropId[] =>
  Array.isArray(raw) ? [...new Set(raw.filter(isPropId))] : []

/** 식비 기록 시 잠깐 보여 줄 랜덤 음식 연출 목록 */
const snackBites = [
  { label: '치킨', image: '/assets/props/food/food-chicken.png', line: '치킨… 네가 시켰는데 내가 먹고 있네요.' },
  { label: '카페 음료', image: '/assets/props/food/food-cafe.png', line: '커피는 네가 마시고, 배부른 건 나예요.' },
  { label: '야식', image: '/assets/props/food/food-late-night.png', line: '야식은 밤이 시킨 거예요. 나는 따라갔어요.' },
  { label: '배달 세트', image: '/assets/props/food/delivery-clutter.png', line: '배달 알림음이 제일 잘 들리네요.' },
  { label: '국밥', image: '/assets/props/food/food-late-night.png', line: '뜨끈한 국밥… 기분도 같이 녹아요.' },
  { label: '디저트', image: '/assets/props/food/food-cafe.png', line: '달콤한 건 기분이고, 영수증은 기록이에요.' },
] as const

type DogMotion = 'eat' | 'hop' | 'nod'

const dialogue = {
  relaxed: [
    '왜 불렀어요? 아직은 평화로운데요.',
    '잔액 좋고, 창밖 좋고. 오늘은 합격이에요.',
    '아무것도 안 사는 것도 능력이에요.',
    '지금의 나를 기억해 둬요. 곧 표정이 바뀔 수도 있어요.',
    '오늘은 칭찬해 줄게요. 지갑이 조용하잖아요.',
    '이 여유, 내일도 부탁해요.',
  ],
  watching: [
    '슬슬 영수증이 말을 걸기 시작했어요.',
    '그 결제, 미래의 네가 허락한 거 맞아요?',
    '아직 괜찮아요. 아직은요.',
    '장바구니는 비웠는데 잔액도 같이 줄었네요.',
    '필요해서 산 거죠? …필요해서요?',
    '알림음이 두 번이면 나도 두 번 봐요.',
    '충동구매면 눈은 살짝만 마주쳐 줘요.',
  ],
  calculating: [
    '잠깐만요. 계산기가 먼저 울었어요.',
    '이번 달 며칠 남았는지는 알고 있죠?',
    '나는 눈찌고, 이건 심문이 아니에요. 아마도요.',
    '영수증끼리 단체 채팅방을 만든 것 같아요.',
    '합계 누르기 전에 한 번만 더 생각해 봐요.',
    '할인받았어도 지출은 지출이에요.',
    '카드는 편한데, 잔액은 조금 예민해요.',
    '이번 주 소비… 내가 세고 있어요. 몰래요.',
  ],
  worried: [
    '내 방 벽이 왜 네 카드값 때문에 갈라지죠?',
    '전등 끌까요, 구독을 끌까요.',
    '오늘은 앱을 닫아도 잔액이 바로 안 돌아와요.',
    '지갑이 조용해서 더 조심하게 돼요.',
    '월급날까지 며칠인지… 세지 마요. 내가 셀게요.',
    '지금은 절약보다 숨 고르기 모드예요.',
    '택배 알림보다 잔액 알림이 먼저였으면 좋겠어요.',
    '네 행복은 존중해요. 내 방 상태는 조금만 덜요.',
  ],
  speechless: [
    '……할 말은 있는데 전기세부터 아낄게요.',
    '창밖 건물들은 불이 켜져 있네요.',
    '다음 월급날까지 우리 친하게 지내요.',
    '혹시 이 상자, 책상으로 써도 될까요?',
    '말보다 잔액이 먼저 줄었네요.',
    '……결제 취소 버튼은 어디에 있죠?',
    '오늘은 구경만 해요. 부탁해요.',
    '눈치 주는 게 일이 됐어요. 잠깐 쉴게요.',
  ],
} as const

/** 가만히 있을 때 가끔 띄우는 호출 멘트 */
const nudgeLines = [
  '나를 눌러봐요',
  '여기 눌러봐요',
  '심심해요…',
  '말 걸어줄래요?',
  '잔액 얘기해요',
  '나 좀 봐줘요',
  '클릭… 해봐요',
  '여긴 나예요',
  '그 결제… 얘기해요',
  '지갑 괜찮아요?',
  '눈치 좀 볼래요?',
  '지금 사려고요?',
] as const

const won = (value: number) => value.toLocaleString('ko-KR')
const numberFromInput = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0
const formattedInput = (value: string | number) => {
  const digits = String(value).replace(/[^0-9]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}
const dateKey = (date: Date) => date.toLocaleDateString('en-CA')

/** YYYY-MM-DD 문자열을 로컬 날짜로 파싱 (타임존 밀림 방지용 정오 기준). */
const parseDateKey = (key: string) => new Date(`${key}T12:00:00`)

/** n일 전/후 날짜 키. */
const shiftDateKey = (key: string, deltaDays: number) => {
  const next = parseDateKey(key)
  next.setDate(next.getDate() + deltaDays)
  return dateKey(next)
}

/** 시트 뱃지에 보여줄 짧은 날짜 라벨. */
const formatDateBadge = (key: string) =>
  parseDateKey(key).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })

const startOfWeek = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() - next.getDay())
  next.setHours(0, 0, 0, 0)
  return next
}

/** 지금 시각 기준 일/주/월 키. 모듈 상수로 고정하지 않고 호출 시점에 계산한다. */
type CalendarPeriod = {
  todayKey: string
  monthKey: string
  weekKey: string
  weekStart: Date
  weekEnd: Date
}

const getCalendarPeriod = (now = new Date()): CalendarPeriod => {
  const todayKey = dateKey(now)
  const monthKey = todayKey.slice(0, 7)
  const weekStart = startOfWeek(now)
  const weekKey = dateKey(weekStart)
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  return { todayKey, monthKey, weekKey, weekStart, weekEnd }
}

const sameCalendarPeriod = (a: CalendarPeriod, b: CalendarPeriod) =>
  a.todayKey === b.todayKey && a.weekKey === b.weekKey && a.monthKey === b.monthKey

const stableIndex = (value: string, length: number) => [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % length

type MissionTemplate = {
  id: string
  title: string
  goal: number
  reward: number
  /** 월 1회만 등장 가능한 미션 */
  monthlyOnce?: boolean
}

const DAILY_MISSION_POOL: MissionTemplate[] = [
  { id: 'd-expense-1', title: '오늘 소비 1건 기록', goal: 1, reward: 20 },
  { id: 'd-expense-2', title: '오늘 소비 2건 기록', goal: 2, reward: 35 },
  { id: 'd-expense-3', title: '오늘 소비 3건 기록', goal: 3, reward: 50 },
  { id: 'd-talk-1', title: '눈찌와 한 번 대화', goal: 1, reward: 15 },
  { id: 'd-talk-2', title: '눈찌와 두 번 대화', goal: 2, reward: 25 },
  { id: 'd-talk-3', title: '눈찌와 세 번 대화', goal: 3, reward: 35 },
]

const WEEKLY_MISSION_POOL: MissionTemplate[] = [
  { id: 'w-expense-5', title: '이번 주 소비 5건 기록', goal: 5, reward: 70 },
  { id: 'w-expense-7', title: '이번 주 소비 7건 기록', goal: 7, reward: 90 },
  { id: 'w-talk-5', title: '이번 주 눈찌와 5번 대화', goal: 5, reward: 60 },
  { id: 'w-talk-8', title: '이번 주 눈찌와 8번 대화', goal: 8, reward: 80 },
  { id: 'w-budget-check', title: '이번 달 예산 확인', goal: 1, reward: 40, monthlyOnce: true },
]

/** 시드 기반 셔플로 같은 날/주면 같은 미션이 유지됩니다. */
const seededShuffle = <T,>(items: T[], seed: string): T[] => {
  const copy = [...items]
  let hash = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) || 1
  for (let index = copy.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const swap = hash % (index + 1)
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

/** 저장된 픽이 없으면 풀에서 count개를 뽑아 저장합니다. */
const pickMissionIds = (storageKey: string, poolIds: string[], count: number, seed: string): string[] => {
  const existing = loadJson<string[] | null>(storageKey, null)
  if (existing?.length) {
    const valid = existing.filter(id => poolIds.includes(id))
    if (valid.length) return valid
  }
  const picked = seededShuffle(poolIds, seed).slice(0, Math.min(count, poolIds.length))
  saveJson(storageKey, picked)
  return picked
}

/** 이번 주 미션 픽 (+ 월 1회 미션은 달에 한 번만 후보에 포함). */
const pickWeeklyMissionIds = (
  scoped: (suffix: string) => string,
  weekKey: string,
  monthKey: string,
): string[] => {
  const monthlyShown = loadJson<string[]>(scoped(`monthly-shown-${monthKey}`), [])
  const eligible = WEEKLY_MISSION_POOL.filter(
    mission => !mission.monthlyOnce || !monthlyShown.includes(mission.id),
  )
  const picked = pickMissionIds(
    scoped(`weekly-pick-${weekKey}`),
    eligible.map(mission => mission.id),
    2,
    weekKey,
  )
  const newlyShown = picked.filter(
    id => WEEKLY_MISSION_POOL.find(mission => mission.id === id)?.monthlyOnce,
  )
  if (newlyShown.length) {
    saveJson(scoped(`monthly-shown-${monthKey}`), [...new Set([...monthlyShown, ...newlyShown])])
  }
  return picked
}

/**
 * 카드/뱅킹 결제 문자에서 금액·가맹점을 뽑습니다.
 * 형식이 제각각이라 완벽하진 않고, 못 찾으면 null을 돌려 수동 입력을 유도합니다.
 */
const parsePaymentSms = (
  raw: string,
): { amount: number; memo: string; category?: ExpenseCategory; spentDate?: string } | null => {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return null

  const amountMatch =
    text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/)
    ?? text.match(/(?:KRW|₩)\s*(\d{1,3}(?:,\d{3})+|\d+)/i)
  if (!amountMatch) return null
  const amount = Number(amountMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null

  // 문자에 적힌 날짜가 있으면 시트 뱃지에 반영합니다.
  let spentDate: string | undefined
  const ymd = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    spentDate = `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  } else {
    const md = text.match(/(\d{1,2})\/(\d{1,2})/)
    if (md) {
      const now = new Date()
      const month = Number(md[1]) - 1
      const day = Number(md[2])
      let parsed = new Date(now.getFullYear(), month, day)
      // 미래 날짜면 작년으로 보정 (연말→연초 문자)
      if (parsed.getTime() > now.getTime()) parsed = new Date(now.getFullYear() - 1, month, day)
      spentDate = dateKey(parsed)
    }
  }

  // 금액·승인/일시불 등 잡음을 지운 뒤 가맹점 후보를 찾습니다.
  let rest = text
    .replace(amountMatch[0], ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\d{1,2}\/\d{1,2}(\s+\d{1,2}:\d{2})?/g, ' ')
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(/(승인|취소|일시불|할부|체크|신용|출금|결제|사용|잔액|Web발신|웹발신)/gi, ' ')
    .replace(/(신한|국민|KB|우리|하나|농협|NH|카카오뱅크|토스|삼성|현대|롯데|BC|씨티|IBK|기업|수협|광주|전북|제주|카드|뱅크|은행)/gi, ' ')
    .replace(/[*＊]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 남은 한글/영문 덩어리 중 긴 쪽을 메모로 씁니다.
  const tokens = rest.match(/[가-힣A-Za-z0-9&·.\-]{2,}/g) ?? []
  const memo = (tokens.sort((a, b) => b.length - a.length)[0] ?? '').slice(0, 40)

  const lower = text.toLowerCase()
  let category: ExpenseCategory | undefined
  if (/스타벅스|커피|카페|이디야|투썸|메가커피|컴포즈/.test(text)) category = 'coffee'
  else if (/배달|배민|요기요|쿠팡이츠|배달의민족/.test(text)) category = 'delivery'
  else if (/택시|카카오T|우버|버스|지하철|교통|티머니/.test(text)) category = 'transport'
  else if (/쿠팡|네이버페이|무신사|올리브영|다이소|쇼핑/.test(text)) category = 'shopping'
  else if (/넷플릭스|유튜브|스포티파이|디즈니|구독|멜론/.test(lower)) category = 'subscription'
  else if (/스팀|플레이스테이션|닌텐도|게임/.test(text)) category = 'game'

  return { amount, memo, category, spentDate }
}

/** 일간/주간 미션 진행도를 id별로 계산합니다. */
const missionProgressById = (
  id: string,
  ctx: { todayExpenseCount: number; dailyTalks: number; weekExpenseCount: number; weeklyTalks: number; budgetChecked: boolean },
) => {
  switch (id) {
    case 'd-expense-1': return Math.min(1, ctx.todayExpenseCount)
    case 'd-expense-2': return Math.min(2, ctx.todayExpenseCount)
    case 'd-expense-3': return Math.min(3, ctx.todayExpenseCount)
    case 'd-talk-1': return Math.min(1, ctx.dailyTalks)
    case 'd-talk-2': return Math.min(2, ctx.dailyTalks)
    case 'd-talk-3': return Math.min(3, ctx.dailyTalks)
    case 'w-expense-5': return Math.min(5, ctx.weekExpenseCount)
    case 'w-expense-7': return Math.min(7, ctx.weekExpenseCount)
    case 'w-talk-5': return Math.min(5, ctx.weeklyTalks)
    case 'w-talk-8': return Math.min(8, ctx.weeklyTalks)
    case 'w-budget-check': return ctx.budgetChecked ? 1 : 0
    default: return 0
  }
}
/** 선택한 연·월에 겹치는 주(일~토) 목록을 만듭니다. */
const weeksOverlappingMonth = (year: number, month: number) => {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const weeks: Array<{ start: Date; end: Date; key: string; label: string }> = []
  let cursor = startOfWeek(monthStart)
  while (cursor <= monthEnd) {
    const start = new Date(cursor)
    const end = new Date(cursor)
    end.setDate(end.getDate() + 7)
    const lastDay = new Date(end.getTime() - 1)
    weeks.push({
      start,
      end,
      key: dateKey(start),
      label: `${start.getMonth() + 1}/${start.getDate()} ~ ${lastDay.getMonth() + 1}/${lastDay.getDate()}`,
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

/**
 * 사용자 식별키를 먼저 발급한 뒤, 그 키로 스코프된 저장소를 씁니다.
 * (비게임 출시 가이드: 식별키 확인·재접속 데이터 유지)
 */
export default function App() {
  const [userHash, setUserHash] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([
      resolveUserHash(),
      isSupabaseConfigured ? ensureAnonymousSession().catch(() => null) : Promise.resolve(null),
    ]).then(([hash]) => {
      if (!alive) return
      migrateLegacyKeys(hash)
      setUserHash(hash)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!userHash) {
    return (
      <div className="app-boot" role="status">
        <p>눈찌를 준비하고 있어요…</p>
      </div>
    )
  }

  return <PocketApp userHash={userHash} />
}

function PocketApp({ userHash }: { userHash: string }) {
  // 이 사용자 전용 저장 키 (예: pocket:u:{hash}:plan)
  const k = (suffix: string) => scopedKey(userHash, suffix)

  // 일/주/월 키는 세션 중에도 자정이 바뀌면 갱신한다 (모듈 로드 시 고정 금지).
  const [period, setPeriod] = useState(() => getCalendarPeriod())
  const { todayKey, monthKey, weekKey, weekStart: thisWeekStart, weekEnd: thisWeekEnd } = period

  const [activePanel, setActivePanel] = useState<'expense' | 'budget' | 'history' | 'mates' | 'shop' | 'settings'>('expense')
  const [roomView, setRoomView] = useState<'personal' | 'team'>('personal')
  const [leaveMateConfirm, setLeaveMateConfirm] = useState(false)
  const [guideExpanded, setGuideExpanded] = useState(false)
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [plan, setPlan] = useState<BudgetPlan>(() => loadJson(k('plan'), defaultPlan))
  const [draftPlan, setDraftPlan] = useState(plan)
  const [expenses, setExpenses] = useState<Expense[]>(() => loadJson(k('expenses'), []))
  const [category, setCategory] = useState<ExpenseCategory>('dining')
  const [memo, setMemo] = useState('')
  const [amount, setAmount] = useState('')
  // 소비 기록 날짜 (YYYY-MM-DD). 기본은 오늘, 캘린더/문자에서 바꿀 수 있음.
  const [expenseDate, setExpenseDate] = useState(() => dateKey(new Date()))
  const [smsPaste, setSmsPaste] = useState('')
  const [message, setMessage] = useState('')
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [dogLine, setDogLine] = useState('')
  const [bubbleKind, setBubbleKind] = useState<'nudge' | 'talk'>('talk')
  const [points, setPoints] = useState(() => loadJson(k('points'), 500))
  const [inventory, setInventory] = useState<SkinId[]>(() => sanitizeSkinInventory(loadJson(k('inventory'), ['attic'])))
  const [equippedSkin, setEquippedSkin] = useState<SkinId>(() => sanitizeEquippedSkin(loadJson(k('equipped-skin'), 'attic')))
  const [propInventory, setPropInventory] = useState<PropId[]>(() => sanitizePropList(loadJson(k('prop-inventory'), [])))
  const [outfitInventory, setOutfitInventory] = useState<OutfitId[]>(() => loadJson(k('outfit-inventory'), ['none']))
  const [equippedOutfit, setEquippedOutfit] = useState<OutfitId>(() => loadJson(k('equipped-outfit'), 'none'))
  const [dailyTalks, setDailyTalks] = useState(() => loadJson(k(`talks-${period.todayKey}`), 0))
  const [weeklyTalks, setWeeklyTalks] = useState(() => loadJson(k(`talks-week-${period.weekKey}`), 0))
  // 예산 확인은 월 1회 미션용으로 월 단위 저장합니다.
  const [budgetChecked, setBudgetChecked] = useState(() => loadJson(k(`budget-check-${period.monthKey}`), false))
  const [claimedDaily, setClaimedDaily] = useState<string[]>(() => loadJson(k(`missions-daily-${period.todayKey}`), []))
  const [claimedWeekly, setClaimedWeekly] = useState<string[]>(() => loadJson(k(`missions-weekly-${period.weekKey}`), []))
  // 오늘/이번 주 랜덤으로 뽑힌 미션 id (기간이 바뀌면 sync에서 다시 고른다)
  const [dailyMissionIds, setDailyMissionIds] = useState(() => (
    pickMissionIds(
      k(`daily-pick-${period.todayKey}`),
      DAILY_MISSION_POOL.map(mission => mission.id),
      2,
      period.todayKey,
    )
  ))
  const [weeklyMissionIds, setWeeklyMissionIds] = useState(() => (
    pickWeeklyMissionIds(k, period.weekKey, period.monthKey)
  ))
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => period.todayKey)
  const [historyView, setHistoryView] = useState<'calendar' | 'list' | 'report'>('list')
  const [listPeriod, setListPeriod] = useState<ListPeriod>('monthly')
  const [listYear, setListYear] = useState(() => new Date().getFullYear())
  const [listMonth, setListMonth] = useState(() => new Date().getMonth())
  const [listWeekKey, setListWeekKey] = useState(() => dateKey(startOfWeek(new Date())))
  const [listCategory, setListCategory] = useState<'all' | ExpenseCategory>('all')
  const [shopTab, setShopTab] = useState<'rooms' | 'outfits' | 'companions' | 'props' | 'together'>('rooms')
  // 온보딩: 소비 유형 설문 → 결과 → 이름 짓기
  const [onboardingDone, setOnboardingDone] = useState(() => loadJson(k('onboarding-done'), false))
  const [spendingType, setSpendingType] = useState<SpendingType | null>(() => loadJson(k('spending-type'), null))
  const [companionId, setCompanionId] = useState<CompanionId>(() => loadJson(k('companion-id'), 'nunchi'))
  // 유저가 붙인 이름 (기본 눈찌). 유형 칭호와는 별개.
  const [companionName, setCompanionName] = useState(() => (
    loadJson(k('companion-name'), DEFAULT_COMPANION_NAME)
  ))
  // 설문은 강제 오버레이가 아니라, 유저가 열 때만 표시 (스킵·닫기 가능)
  const [ownedCompanions, setOwnedCompanions] = useState<CompanionId[]>(() => loadOwnedCompanions(k))
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('survey')
  const [surveyIndex, setSurveyIndex] = useState(0)
  const [surveyAnswers, setSurveyAnswers] = useState<SpendingType[]>([])
  const [nameDraft, setNameDraft] = useState(DEFAULT_COMPANION_NAME)
  // 전체 UI 테마 (버튼·탭·강조색). 기본 하늘 파스텔.
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = loadJson<unknown>(k('ui-theme'), 'sky')
    return isThemeId(saved) ? saved : 'sky'
  })
  const [mateRoom, setMateRoom] = useState<MateRoomState>(() => ({
    ...defaultMateRoom,
    ...loadJson(k('mate-room'), defaultMateRoom),
  }))
  const [mateCodeInput, setMateCodeInput] = useState('')
  const [dailyMateMission, setDailyMateMission] = useState<DailyMateMission>({ type: 'each_limit', title: '둘 다 15,000원 이하로 쓰기', goal: 15_000 })
  const [backupCode, setBackupCode] = useState('')
  const [backupCodeInput, setBackupCodeInput] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  // 리워드 광고: 로드 완료 후에만 시청 가능 + 일일 한도/쿨다운
  const [rewardAdReady, setRewardAdReady] = useState(false)
  const [rewardAdBusy, setRewardAdBusy] = useState(false)
  const [rewardAdSupported, setRewardAdSupported] = useState(true)
  // 꾸미기: 리워드 loaded(또는 실패) 후에만 배너 attach — Android 동시 로드 누락 방지
  const [shopBannerEnabled, setShopBannerEnabled] = useState(false)
  const [rewardAdsToday, setRewardAdsToday] = useState(() => (
    loadJson(k(`reward-ads-${period.todayKey}`), 0)
  ))
  const [rewardAdLastAt, setRewardAdLastAt] = useState(() => loadJson(k('reward-ad-last-at'), 0))
  // 꾸미기 탭에서 쿨다운 남은 시간을 1초마다 갱신
  const [shopClockMs, setShopClockMs] = useState(() => Date.now())
  // 눈찌 짧은 모션 / 식비 랜덤 음식 연출 (PNG + CSS만 사용)
  const [dogMotion, setDogMotion] = useState<DogMotion | null>(null)
  const [activeSnack, setActiveSnack] = useState<(typeof snackBites)[number] | null>(null)
  // 방 안 랜덤 배회로: 목표 좌표를 골라 천천히 이동합니다.
  const [wander, setWander] = useState({ left: 50, bottom: -2, facing: 1 as 1 | -1, moving: false, duration: 3.2 })
  const motionTimer = useRef(0)
  const snackTimer = useRef(0)
  const nudgeTimer = useRef(0)
  const nudgeHideTimer = useRef(0)
  // 리워드 시청 중 플래그 — Android 일부 버전은 dismissed가 안 와서 busy가 남을 수 있음
  const rewardCycleOpenRef = useRef(false)
  const rewardAdShownRef = useRef(false)
  const rewardBusySafetyTimer = useRef(0)
  const endRewardAdCycleRef = useRef<() => void>(() => {})
  const dogAreaRef = useRef<HTMLDivElement | null>(null)
  const bubbleVisibleRef = useRef(bubbleVisible)
  const bubbleKindRef = useRef<'nudge' | 'talk'>('talk')
  const dogMotionRef = useRef(dogMotion)
  const activeSnackRef = useRef(activeSnack)
  const dogLineRef = useRef(dogLine)
  // syncCalendarPeriod가 최신 period와 비교할 수 있도록 보관
  const periodRef = useRef(period)
  periodRef.current = period

  // 자정·주 경계가 지나도 미션/대화 카운트가 새 기간으로 넘어가도록 주기적으로 맞춤.
  useEffect(() => {
    const applyPeriod = (next: CalendarPeriod, previous: CalendarPeriod) => {
      setPeriod(next)
      // 키와 상태값을 같은 턴에 맞춰, 저장 effect가 어제 수치를 새 키에 쓰지 않게 한다.
      if (next.todayKey !== previous.todayKey) {
        setDailyTalks(loadJson(k(`talks-${next.todayKey}`), 0))
        setClaimedDaily(loadJson(k(`missions-daily-${next.todayKey}`), []))
        setDailyMissionIds(
          pickMissionIds(
            k(`daily-pick-${next.todayKey}`),
            DAILY_MISSION_POOL.map(mission => mission.id),
            2,
            next.todayKey,
          ),
        )
        setRewardAdsToday(loadJson(k(`reward-ads-${next.todayKey}`), 0))
        setSelectedDate(current => (current === previous.todayKey ? next.todayKey : current))
        setExpenseDate(current => (current === previous.todayKey ? next.todayKey : current))
      }
      if (next.weekKey !== previous.weekKey || next.monthKey !== previous.monthKey) {
        setWeeklyTalks(loadJson(k(`talks-week-${next.weekKey}`), 0))
        setClaimedWeekly(loadJson(k(`missions-weekly-${next.weekKey}`), []))
        setWeeklyMissionIds(pickWeeklyMissionIds(k, next.weekKey, next.monthKey))
      }
      if (next.monthKey !== previous.monthKey) {
        setBudgetChecked(loadJson(k(`budget-check-${next.monthKey}`), false))
      }
    }

    const syncCalendarPeriod = () => {
      const next = getCalendarPeriod()
      const previous = periodRef.current
      if (sameCalendarPeriod(previous, next)) return
      applyPeriod(next, previous)
    }

    syncCalendarPeriod()
    const timer = window.setInterval(syncCalendarPeriod, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncCalendarPeriod()
    }
    window.addEventListener('focus', syncCalendarPeriod)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', syncCalendarPeriod)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userHash])

  // 잔액·stage·다락방 낡음은 '이번 달' 지출만 반영 (과거 달 누적 제외).
  const currentMonthExpenses = useMemo(
    () => filterExpensesByMonth(expenses, todayKey),
    [expenses, todayKey],
  )
  const snapshot = useMemo(
    () => calculateMonthlyBudget(plan, currentMonthExpenses, todayKey),
    [plan, currentMonthExpenses, todayKey],
  )
  const foodExpenses = currentMonthExpenses
    .filter(x => ['coffee', 'delivery', 'dining'].includes(x.category))
    .sort((a, b) => a.spentAt.localeCompare(b.spentAt))
  const foodSpent = foodExpenses.reduce((sum, x) => sum + x.amount, 0)
  const foodExpenseCount = foodExpenses.length
  const shoppingCount = currentMonthExpenses.filter(x => x.category === 'shopping').length
  // 기본 소품 + 구매한 추가 소품이 소비 기록에 따라 방에 쌓임 (구매만으로는 배치되지 않음)
  const foodPropPool = [
    ...BASE_FOOD_PROP_IMAGES,
    ...roomDecorProps
      .filter(prop => prop.kind === 'food' && propInventory.includes(prop.id))
      .map(prop => prop.image),
  ]
  const parcelPropPool = [
    ...BASE_PARCEL_PROP_IMAGES,
    ...roomDecorProps
      .filter(prop => prop.kind === 'parcel' && propInventory.includes(prop.id))
      .map(prop => prop.image),
  ]
  const deliveryPileCount = Math.min(4, Math.floor(foodExpenseCount / 3))
  const parcelPileCount = Math.min(4, Math.floor(shoppingCount / 3))
  const deliveryPiles = Array.from({ length: deliveryPileCount }, (_, index) => {
    const seedExpense = foodExpenses[index * 3 + 2] ?? foodExpenses[index * 3]
    return foodPropPool[stableIndex(seedExpense?.id ?? String(index), foodPropPool.length)]
  })
  const shoppingExpenses = currentMonthExpenses
    .filter(x => x.category === 'shopping')
    .sort((a, b) => a.spentAt.localeCompare(b.spentAt))
  const parcelPiles = Array.from({ length: parcelPileCount }, (_, index) => {
    const seedExpense = shoppingExpenses[index * 3 + 2] ?? shoppingExpenses[index * 3]
    return parcelPropPool[stableIndex(seedExpense?.id ?? String(index), parcelPropPool.length)]
  })
  const todayExpenseCount = expenses.filter(expense => new Date(expense.spentAt).toLocaleDateString('en-CA') === todayKey).length
  const todaySpent = expenses
    .filter(expense => new Date(expense.spentAt).toLocaleDateString('en-CA') === todayKey)
    .reduce((sum, expense) => sum + expense.amount, 0)
  const weekExpenseCount = expenses.filter(expense => {
    const spent = new Date(expense.spentAt)
    return spent >= thisWeekStart && spent < thisWeekEnd
  }).length
  const missionCtx = {
    todayExpenseCount,
    dailyTalks,
    weekExpenseCount,
    weeklyTalks,
    budgetChecked,
  }
  const dailyMissions = dailyMissionIds.map(id => {
    const template = DAILY_MISSION_POOL.find(mission => mission.id === id)!
    return {
      ...template,
      progress: missionProgressById(id, missionCtx),
    }
  })
  const weeklyMissions = weeklyMissionIds.map(id => {
    const template = WEEKLY_MISSION_POOL.find(mission => mission.id === id)!
    return {
      ...template,
      progress: missionProgressById(id, missionCtx),
    }
  })
  const foodRatio = snapshot.spendableBudget > 0 ? foodSpent / snapshot.spendableBudget : 0
  const foodLevel = foodRatio >= .2 ? 2 : foodRatio >= .1 ? 1 : 0
  const [status, line] = copy[snapshot.stage]
  const equippedRoom = roomSkins.find(skin => skin.id === equippedSkin) ?? roomSkins[0]
  const roomImage = equippedSkin === 'attic' ? roomImages[snapshot.stage] : equippedRoom.image
  // 식비·예산·먹기 모션에 따라 상태 키를 고르고, 착용 옷의 같은 상태 PNG를 씁니다 (guide.md).
  const dogVisualState: DogVisualState = dogMotion === 'eat'
    ? 'eating'
    : foodLevel === 2
      ? 'very-chubby'
      : foodLevel === 1
        ? 'chubby'
        : snapshot.stage === 'worried' || snapshot.stage === 'speechless'
          ? 'receipt'
          : 'neutral'
  const activeCompanion = companions.find(item => item.id === companionId) ?? companions[0]
  const equippedClothes = characterOutfits.find(outfit =>
    outfit.id === equippedOutfit && (outfit.companionId === null || outfit.companionId === companionId)
  ) ?? characterOutfits[0]
  const availableOutfits = characterOutfits.filter(outfit => outfit.companionId === null || outfit.companionId === companionId)
  const dogStateMap = equippedClothes.states ?? activeCompanion.states
  const displayDogImage = dogStateMap[dogVisualState]
  const mateCompanion = companions.find(item => item.id === mateRoom.mateAvatar?.companionId) ?? companions[0]
  const mateOutfit = characterOutfits.find(outfit =>
    outfit.id === mateRoom.mateAvatar?.outfitId
    && (outfit.companionId === null || outfit.companionId === mateCompanion.id)
  ) ?? characterOutfits[0]
  const mateStateMap = mateOutfit.states ?? mateCompanion.states
  const mateDisplayImage = mateStateMap[mateRoom.mateAvatar?.visualState ?? 'neutral']
  const myMateProgress = Math.min(100, (todaySpent / DAILY_MATE_LIMIT) * 100)
  const friendMateProgress = Math.min(100, (mateRoom.mateSpentToday / DAILY_MATE_LIMIT) * 100)
  const myTodayExpenses = expenses.filter(expense => new Date(expense.spentAt).toLocaleDateString('en-CA') === todayKey)
  // 팀룸도 개인룸과 똑같이 월간 기록 3건당 소품 1개가 생깁니다.
  // 내 누적 단계와 상대가 동기화한 누적 단계를 합쳐 공동룸에 보여줍니다.
  const mateFoodProps = Math.min(8, deliveryPileCount + (mateRoom.mateAvatar?.foodPileCount ?? 0))
  const mateShoppingProps = Math.min(8, parcelPileCount + (mateRoom.mateAvatar?.parcelPileCount ?? 0))
  const myCategoryTotal = (names: ExpenseCategory[]) => myTodayExpenses.filter(item => names.includes(item.category)).reduce((sum, item) => sum + item.amount, 0)
  const missionCurrent = dailyMateMission.type === 'each_limit'
    ? Math.max(todaySpent, mateRoom.mateSpentToday)
    : dailyMateMission.type === 'combined_limit'
      ? todaySpent + mateRoom.mateSpentToday
      : dailyMateMission.type === 'food_limit'
        ? myCategoryTotal(['coffee', 'delivery', 'dining']) + ['coffee', 'delivery', 'dining'].reduce((sum, key) => sum + Number(mateRoom.mateCategoryTotals[key] ?? 0), 0)
        : myCategoryTotal(['shopping']) + Number(mateRoom.mateCategoryTotals.shopping ?? 0)
  const mateMissionComplete = Boolean(mateRoom.mateName) && missionCurrent <= dailyMateMission.goal
  const mateMissionProgress = Math.min(100, (missionCurrent / dailyMateMission.goal) * 100)
  const nextMateLevelDays = mateRoom.roomLevel >= 4 ? 14 : mateRoom.roomLevel === 3 ? 14 : mateRoom.roomLevel === 2 ? 7 : 3
  const mateLevelProgress = mateRoom.roomLevel >= 4 ? 100 : Math.min(100, (mateRoom.successDays / nextMateLevelDays) * 100)
  // 설문 결과 미리보기 (결과 화면용)
  const surveyResultType = surveyAnswers.length === onboardingQuestions.length
    ? scoreSpendingType(surveyAnswers)
    : spendingType
  // 설문 결과는 유형 눈찌만 (기본 강아지 제외)
  const resultCompanion = surveyCompanions.find(item => item.id === (surveyResultType ?? 'foodie'))
    ?? surveyCompanions[0]!

  useEffect(() => saveJson(k('plan'), plan), [plan, userHash])
  useEffect(() => saveJson(k('expenses'), expenses), [expenses, userHash])
  useEffect(() => saveJson(k('points'), points), [points, userHash])
  useEffect(() => saveJson(k('inventory'), inventory), [inventory, userHash])
  useEffect(() => saveJson(k('equipped-skin'), equippedSkin), [equippedSkin, userHash])
  useEffect(() => saveJson(k('prop-inventory'), propInventory), [propInventory, userHash])
  useEffect(() => saveJson(k('outfit-inventory'), outfitInventory), [outfitInventory, userHash])
  useEffect(() => saveJson(k('equipped-outfit'), equippedOutfit), [equippedOutfit, userHash])
  useEffect(() => saveJson(k('onboarding-done'), onboardingDone), [onboardingDone, userHash])
  useEffect(() => saveJson(k('spending-type'), spendingType), [spendingType, userHash])
  useEffect(() => saveJson(k('companion-id'), companionId), [companionId, userHash])
  useEffect(() => saveJson(k('companion-name'), companionName), [companionName, userHash])
  useEffect(() => saveJson(k('owned-companions'), ownedCompanions), [ownedCompanions, userHash])
  useEffect(() => saveJson(k('ui-theme'), themeId), [themeId, userHash])
  useEffect(() => saveJson(k('mate-room'), mateRoom), [mateRoom, userHash])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    void loadMateRoom().then(room => {
      if (!room) {
        setMateRoom(defaultMateRoom)
        setRoomView('personal')
        return
      }
      setMateRoom(current => ({ ...current, ...room }))
    }).catch(() => {})
  }, [userHash])
  useEffect(() => {
    if (!mateRoom.roomId || !isSupabaseConfigured) return
    const timer = window.setTimeout(() => {
      void syncMateDay(mateRoom.roomId!, expenses, mateRoom.shareDetails)
        .then(() => completeMateDailyMission(mateRoom.roomId!))
        .then(result => {
          if (!result.completed) return
          setMateRoom(current => ({
            ...current,
            successDays: result.successDays ?? current.successDays,
            roomLevel: result.roomLevel ?? current.roomLevel,
            themeProgress: {
              ...current.themeProgress,
              [current.theme]: {
                successDays: result.successDays ?? current.successDays,
                roomLevel: result.roomLevel ?? current.roomLevel,
              },
            },
          }))
          if (result.new) setMessage('오늘 둘이 한도 지키기 성공! 함께 쓰는 공간이 자랐어요.')
        })
        .catch(() => {})
    }, 500)
    return () => window.clearTimeout(timer)
  }, [mateRoom.roomId, mateRoom.shareDetails, expenses])
  useEffect(() => {
    if (!mateRoom.roomId || !isSupabaseConfigured) return
    const timer = window.setTimeout(() => {
      void syncMateAvatar(mateRoom.roomId!, companionName, {
        companionId,
        outfitId: equippedClothes.id,
        visualState: dogVisualState,
        foodPileCount: deliveryPileCount,
        parcelPileCount,
      }).catch(() => {})
    }, 350)
    return () => window.clearTimeout(timer)
  }, [mateRoom.roomId, companionName, companionId, equippedClothes.id, dogVisualState, deliveryPileCount, parcelPileCount])
  useEffect(() => {
    if (!mateRoom.roomId || !isSupabaseConfigured) return
    let alive = true
    const refresh = () => void loadMateActivity(mateRoom.roomId!).then(activity => {
      if (alive) setMateRoom(current => ({ ...current, ...activity }))
    }).catch(() => {})
    refresh()
    const timer = window.setInterval(refresh, 10_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [mateRoom.roomId])
  useEffect(() => {
    if (!mateRoom.roomId || !isSupabaseConfigured) return
    void loadDailyMateMission(mateRoom.roomId).then(setDailyMateMission).catch(() => {})
  }, [mateRoom.roomId, todayKey])
  // 탭·FAB·칩 CSS 변수 + TDS 버튼(brandPrimaryColor)이 같은 테마를 쓰도록 html에 반영
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])
  useEffect(() => saveJson(k(`talks-${todayKey}`), dailyTalks), [dailyTalks, userHash, todayKey])
  useEffect(() => saveJson(k(`talks-week-${weekKey}`), weeklyTalks), [weeklyTalks, userHash, weekKey])
  useEffect(() => saveJson(k(`budget-check-${monthKey}`), budgetChecked), [budgetChecked, userHash, monthKey])
  useEffect(() => saveJson(k(`missions-daily-${todayKey}`), claimedDaily), [claimedDaily, userHash, todayKey])
  useEffect(() => saveJson(k(`missions-weekly-${weekKey}`), claimedWeekly), [claimedWeekly, userHash, weekKey])
  useEffect(() => saveJson(k(`reward-ads-${todayKey}`), rewardAdsToday), [rewardAdsToday, userHash, todayKey])
  useEffect(() => saveJson(k('reward-ad-last-at'), rewardAdLastAt), [rewardAdLastAt, userHash])

  // 꾸미기 탭일 때만 쿨다운 카운트다운용 시계
  useEffect(() => {
    if (activePanel !== 'shop') return
    setShopClockMs(Date.now())
    const timer = window.setInterval(() => setShopClockMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activePanel])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [message])

  // BottomSheet 스크롤락이 window/body를 흔들지 않도록,
  // 스크롤은 .app-shell에만 두고 시트 동안 그 위치를 고정합니다.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell')
    // 예전에 window로 스크롤돼 있던 위치를 셸로 한 번 옮깁니다.
    if (shell && window.scrollY > 0) {
      shell.scrollTop = window.scrollY
      window.scrollTo(0, 0)
    }
  }, [])

  useEffect(() => {
    if (!expenseSheetOpen) return
    const shell = document.querySelector<HTMLElement>('.app-shell')
    const savedShellScroll = shell?.scrollTop ?? 0
    document.body.classList.add('is-expense-sheet-open')
    window.scrollTo(0, 0)

    // TDS가 body에 넣는 position:fixed / top 보정이 남아도 창 스크롤은 0 유지
    const keepWindowTop = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    keepWindowTop()
    const timer = window.setInterval(keepWindowTop, 50)

    return () => {
      window.clearInterval(timer)
      document.body.classList.remove('is-expense-sheet-open')
      // TDS 스크롤락이 남긴 인라인 스타일을 정리해 닫을 때 점프를 막습니다.
      document.body.style.removeProperty('position')
      document.body.style.removeProperty('top')
      document.body.style.removeProperty('left')
      document.body.style.removeProperty('width')
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
      window.scrollTo(0, 0)
      requestAnimationFrame(() => {
        if (shell) shell.scrollTop = savedShellScroll
      })
    }
  }, [expenseSheetOpen])

  // 꾸미기 탭: 리워드 먼저 로드 → 완료/실패 후 배너 허용 (load → show → load)
  useEffect(() => {
    if (activePanel !== 'shop') {
      setShopBannerEnabled(false)
      return
    }
    if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) {
      setRewardAdSupported(false)
      setRewardAdReady(false)
      // 리워드 미지원이면 배너만 단독 attach
      setShopBannerEnabled(true)
      return
    }
    setRewardAdSupported(true)
    setRewardAdReady(false)
    setShopBannerEnabled(false)

    const unregister = loadFullScreenAd({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: event => {
        if (event.type === 'loaded') {
          setRewardAdReady(true)
          setShopBannerEnabled(true)
        }
      },
      onError: () => {
        setRewardAdReady(false)
        // 리워드 실패해도 배너는 붙일 수 있게 게이트 오픈
        setShopBannerEnabled(true)
        setMessage('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      },
    })

    return () => {
      unregister()
    }
  }, [activePanel])

  /** 시청 후 다음 리워드 프리로드 — 배너를 잠시 내린 뒤 로드해 동시 호출을 피함 */
  const preloadNextRewardedAd = () => {
    if (!loadFullScreenAd.isSupported()) {
      setRewardAdReady(false)
      setShopBannerEnabled(true)
      return
    }
    setShopBannerEnabled(false)
    setRewardAdReady(false)
    loadFullScreenAd({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: next => {
        if (next.type === 'loaded') {
          setRewardAdReady(true)
          setShopBannerEnabled(true)
        }
      },
      onError: () => {
        setRewardAdReady(false)
        setShopBannerEnabled(true)
      },
    })
  }

  /**
   * 리워드 표시 사이클 종료.
   * dismissed 누락(Android 일부)·복귀·안전 타이머에서 공통으로 호출해 busy 고착을 막음.
   */
  const endRewardAdCycle = () => {
    if (!rewardCycleOpenRef.current) return
    rewardCycleOpenRef.current = false
    rewardAdShownRef.current = false
    window.clearTimeout(rewardBusySafetyTimer.current)
    setRewardAdBusy(false)
    preloadNextRewardedAd()
  }
  endRewardAdCycleRef.current = endRewardAdCycle

  // 광고 닫힌 뒤 WebView로 복귀했는데 dismissed가 없으면 busy 해제
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!rewardCycleOpenRef.current || !rewardAdShownRef.current) return
      endRewardAdCycleRef.current()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearTimeout(rewardBusySafetyTimer.current)
    }
  }, [])
  useEffect(() => {
    bubbleVisibleRef.current = bubbleVisible
  }, [bubbleVisible])
  useEffect(() => {
    bubbleKindRef.current = bubbleKind
  }, [bubbleKind])
  useEffect(() => {
    dogMotionRef.current = dogMotion
  }, [dogMotion])
  useEffect(() => {
    activeSnackRef.current = activeSnack
  }, [activeSnack])
  useEffect(() => {
    dogLineRef.current = dogLine
  }, [dogLine])

  useEffect(() => () => {
    window.clearTimeout(motionTimer.current)
    window.clearTimeout(snackTimer.current)
    window.clearTimeout(nudgeTimer.current)
    window.clearTimeout(nudgeHideTimer.current)
  }, [])

  // 가끔 눈찌가 "나를 눌러봐"류 멘트를 말풍선으로 띄웁니다.
  useEffect(() => {
    const scheduleNudge = () => {
      const wait = 7000 + Math.floor(Math.random() * 9000)
      nudgeTimer.current = window.setTimeout(() => {
        if (
          !bubbleVisibleRef.current
          && !dogMotionRef.current
          && !activeSnackRef.current
        ) {
          const candidates = nudgeLines.filter(text => text !== dogLineRef.current)
          const next = candidates[Math.floor(Math.random() * candidates.length)] ?? nudgeLines[0]
          setDogLine(next)
          setBubbleKind('nudge')
          setBubbleVisible(true)
          window.clearTimeout(nudgeHideTimer.current)
          nudgeHideTimer.current = window.setTimeout(() => {
            if (bubbleKindRef.current === 'nudge') {
              setBubbleVisible(false)
            }
          }, 3200)
        }
        scheduleNudge()
      }, wait)
    }
    scheduleNudge()
    return () => {
      window.clearTimeout(nudgeTimer.current)
      window.clearTimeout(nudgeHideTimer.current)
    }
  }, [])

  // 눈찌/말풍선 밖을 누르면 말풍선을 닫습니다.
  useEffect(() => {
    if (!bubbleVisible) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && dogAreaRef.current?.contains(target)) return
      setBubbleVisible(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [bubbleVisible])

  // 특수 모션이 아닐 때 방 안 임의의 지점으로 천천히 걸어 다닙니다.
  useEffect(() => {
    if (dogMotion) {
      setWander(current => ({ ...current, moving: false }))
      return
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    let timer = 0

    const schedule = (delayMs: number, action: () => void) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!cancelled) action()
      }, delayMs)
    }

    const roam = () => {
      let travelMs = 3200
      setWander(current => {
        let left = 24 + Math.random() * 52
        let bottom = -5 + Math.random() * 10
        // 너무 가까운 지점은 다시 뽑아 어색한 제자리걸음을 줄입니다.
        if (Math.abs(left - current.left) < 10) left = left > 50 ? left - 18 : left + 18
        const duration = 2.6 + Math.random() * 2.4
        travelMs = Math.round(duration * 1000)
        const facing = (left >= current.left ? 1 : -1) as 1 | -1
        return { left, bottom, facing, moving: true, duration }
      })
      schedule(travelMs, () => {
        setWander(current => ({ ...current, moving: false }))
        schedule(800 + Math.random() * 2800, roam)
      })
    }

    schedule(600 + Math.random() * 900, roam)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [dogMotion])

  /** PNG 캐릭터에 CSS 클래스만 잠깐 붙여 모션을 재생합니다. */
  const playDogMotion = (motion: DogMotion, durationMs = 1400) => {
    window.clearTimeout(motionTimer.current)
    setDogMotion(motion)
    motionTimer.current = window.setTimeout(() => setDogMotion(null), durationMs)
  }

  /** 식비 기록 시 먹기 포즈 PNG로 바꾸고, 짧은 씹기 모션을 재생합니다. */
  const playSnackBite = (line?: string) => {
    const snack = snackBites[Math.floor(Math.random() * snackBites.length)]
    window.clearTimeout(snackTimer.current)
    setActiveSnack(snack)
    // 도메인 반응 멘트가 있으면 그걸 쓰고, 없으면 음식 기본 대사
    setDogLine(line ?? snack.line)
    setBubbleVisible(true)
    playDogMotion('eat', 2400)
    snackTimer.current = window.setTimeout(() => setActiveSnack(null), 2500)
    return snack
  }

  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index + 1)),
  ]
  const expensesByDate = expenses.reduce<Record<string, Expense[]>>((grouped, expense) => {
    const key = dateKey(new Date(expense.spentAt))
    grouped[key] = [...(grouped[key] ?? []), expense]
    return grouped
  }, {})
  const selectedExpenses = expensesByDate[selectedDate] ?? []
  const selectedTotal = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const selectedBaseDate = new Date(`${selectedDate}T12:00:00`)
  const currentYear = new Date().getFullYear()
  const listYears = useMemo(() => {
    const years = new Set<number>([currentYear, listYear, viewMonth.getFullYear()])
    for (const expense of expenses) years.add(new Date(expense.spentAt).getFullYear())
    for (let year = currentYear; year >= currentYear - 5; year -= 1) years.add(year)
    return [...years].sort((a, b) => b - a)
  }, [expenses, listYear, viewMonth, currentYear])
  const listWeeks = useMemo(() => weeksOverlappingMonth(listYear, listMonth), [listYear, listMonth])
  const activeWeek = listWeeks.find(week => week.key === listWeekKey) ?? listWeeks[0]
  useEffect(() => {
    if (!listWeeks.some(week => week.key === listWeekKey) && listWeeks[0]) setListWeekKey(listWeeks[0].key)
  }, [listWeeks, listWeekKey])

  const periodExpenses = expenses.filter(expense => {
    const spentDate = new Date(expense.spentAt)
    if (listPeriod === 'yearly') return spentDate.getFullYear() === listYear
    if (listPeriod === 'monthly') return spentDate.getFullYear() === listYear && spentDate.getMonth() === listMonth
    if (!activeWeek) return false
    return spentDate >= activeWeek.start && spentDate < activeWeek.end
  })
  const visibleListExpenses = periodExpenses
    .filter(expense => listCategory === 'all' || expense.category === listCategory)
    .sort((a, b) => Date.parse(b.spentAt) - Date.parse(a.spentAt))
  const listTotal = visibleListExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const reportMonthExpenses = useMemo(() => expenses.filter(expense => {
    const spent = new Date(expense.spentAt)
    return spent.getFullYear() === listYear && spent.getMonth() === listMonth
  }), [expenses, listYear, listMonth])
  const previousReportDate = new Date(listYear, listMonth - 1, 1)
  const previousMonthExpenses = useMemo(() => expenses.filter(expense => {
    const spent = new Date(expense.spentAt)
    return spent.getFullYear() === previousReportDate.getFullYear() && spent.getMonth() === previousReportDate.getMonth()
  }), [expenses, previousReportDate.getFullYear(), previousReportDate.getMonth()])
  const reportTotal = reportMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const previousReportTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const reportChange = previousReportTotal > 0
    ? Math.round(((reportTotal - previousReportTotal) / previousReportTotal) * 100)
    : null
  const reportCategoryRows = categories
    .map(info => ({
      ...info,
      amount: reportMonthExpenses.filter(expense => expense.category === info.value).reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter(row => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const reportDayTotals = reportMonthExpenses.reduce<Record<string, number>>((totals, expense) => {
    const key = dateKey(new Date(expense.spentAt))
    totals[key] = (totals[key] ?? 0) + expense.amount
    return totals
  }, {})
  const reportTopDay = Object.entries(reportDayTotals).sort((a, b) => b[1] - a[1])[0]
  const reportDaysInMonth = new Date(listYear, listMonth + 1, 0).getDate()
  const reportMonthStart = new Date(listYear, listMonth, 1)
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const reportElapsedDays = reportMonthStart > currentMonthStart
    ? 0
    : reportMonthStart.getTime() === currentMonthStart.getTime()
      ? new Date().getDate()
      : reportDaysInMonth
  const reportNoSpendDays = Math.max(0, reportElapsedDays - Object.keys(reportDayTotals).length)
  const reportDailyAverage = reportElapsedDays > 0 ? Math.round(reportTotal / reportElapsedDays) : 0
  const reportBudgetRatio = snapshot.spendableBudget > 0 ? Math.round((reportTotal / snapshot.spendableBudget) * 100) : 0
  const reportComment = reportMonthExpenses.length === 0
    ? '아직 기록이 없어요. 한 건부터 모으면 소비 습관이 보여요.'
    : reportBudgetRatio > 100
      ? '생활예산을 넘겼어요. 다음 결제 전에 한 번만 저랑 눈 마주쳐요.'
      : reportChange !== null && reportChange <= -10
        ? `지난달보다 ${Math.abs(reportChange)}% 줄였어요. 이번 달은 제가 칭찬할게요.`
        : reportCategoryRows[0]
          ? `${reportCategoryRows[0].label}에 가장 많이 썼어요. 만족도도 1등이었는지 확인해 봐요.`
          : '이번 달 소비 흐름은 아직 조용해요.'
  const periodLabel = listPeriod === 'yearly'
    ? `${listYear}년`
    : listPeriod === 'monthly'
      ? `${listYear}년 ${listMonth + 1}월`
      : `${listYear}년 ${listMonth + 1}월 · ${activeWeek?.label ?? ''}`

  useEffect(() => {
    const newlyDaily = dailyMissions.filter(mission => mission.progress >= mission.goal && !claimedDaily.includes(mission.id))
    const newlyWeekly = weeklyMissions.filter(mission => mission.progress >= mission.goal && !claimedWeekly.includes(mission.id))
    if (!newlyDaily.length && !newlyWeekly.length) return
    const reward = [...newlyDaily, ...newlyWeekly].reduce((sum, mission) => sum + mission.reward, 0)
    if (newlyDaily.length) setClaimedDaily(current => [...current, ...newlyDaily.map(mission => mission.id)])
    if (newlyWeekly.length) setClaimedWeekly(current => [...current, ...newlyWeekly.map(mission => mission.id)])
    setPoints(current => current + reward)
    playDogMotion('hop', 1200)
    setMessage(`미션 완료! ${reward}냠을 받았어요 🍪`)
  }, [todayExpenseCount, weekExpenseCount, budgetChecked, dailyTalks, weeklyTalks, claimedDaily, claimedWeekly])

  const savePlan = (event: FormEvent) => {
    event.preventDefault()
    if (draftPlan.monthlyIncome <= 0) return setMessage('월급은 0원보다 크게 입력해 주세요.')
    if (draftPlan.fixedExpenses + draftPlan.savingsGoal > draftPlan.monthlyIncome) return setMessage('고정비와 저축 목표가 월급보다 많아요.')
    setPlan(draftPlan); setBudgetChecked(true); setMessage('이번 달 예산 설정을 확인했어요.')
  }
  /** 소비 시트 열기. 날짜를 넘기면 그날로, 없으면 오늘로 맞춥니다. */
  const openExpenseSheet = (preferredDate?: string) => {
    setExpenseDate(preferredDate ?? dateKey(new Date()))
    setExpenseSheetOpen(true)
  }

  const saveExpense = (event: FormEvent) => {
    event.preventDefault()
    const parsed = numberFromInput(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) return setMessage('사용 금액을 올바르게 입력해 주세요.')
    // 상세 메모는 선택 — 비우면 종류 이름을 씁니다.
    const memoText = memo.trim() || categoryInfo(category).label
    // 선택한 날짜 + 현재 시각으로 저장 (같은 날 여러 건 정렬용).
    const now = new Date()
    const [year, month, day] = expenseDate.split('-').map(Number)
    const spentAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString()
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      category,
      amount: parsed,
      memo: memoText,
      spentAt,
    }
    // 카테고리·잔액 stage 기반 도메인 멘트를 말풍선/토스트에 연결
    const reaction = createExpenseReaction(plan, expenses, newExpense)
    setExpenses(list => [newExpense, ...list])
    setMemo('')
    setAmount('')
    setSmsPaste('')
    setExpenseDate(dateKey(new Date()))
    setExpenseSheetOpen(false)

    const isFood = category === 'coffee' || category === 'delivery' || category === 'dining'
    if (isFood) {
      playSnackBite(reaction.message)
      setMessage(`${memoText} ${won(parsed)}원 · ${reaction.message}`)
      return
    }
    if (category === 'shopping') {
      playDogMotion('hop', 1200)
      setDogLine(reaction.message)
      setBubbleVisible(true)
      setMessage(`${memoText} ${won(parsed)}원 · ${reaction.message}`)
      return
    }
    playDogMotion('nod', 1000)
    setDogLine(reaction.message)
    setBubbleVisible(true)
    setMessage(`${memoText} ${won(parsed)}원 · ${reaction.message}`)
  }
  const applySmsPaste = () => {
    const parsed = parsePaymentSms(smsPaste)
    if (!parsed) {
      setMessage('금액(원)을 찾지 못했어요. 문자를 다시 붙여넣어 주세요.')
      return
    }
    setAmount(String(parsed.amount))
    if (parsed.memo) setMemo(parsed.memo)
    if (parsed.category) setCategory(parsed.category)
    if (parsed.spentDate) setExpenseDate(parsed.spentDate)
    setSmsPaste('')
    setMessage(`${won(parsed.amount)}원${parsed.memo ? ` · ${parsed.memo}` : ''} 반영했어요. 확인하고 기록해 주세요.`)
  }
  const updatePlan = (key: keyof BudgetPlan, value: string) => setDraftPlan(current => ({ ...current, [key]: numberFromInput(value) }))
  const addQuickAmount = (value: number) => setAmount(current => String(numberFromInput(current) + value))
  const categoryInfo = (value: ExpenseCategory) => categories.find(x => x.value === value) ?? categories.at(-1)!
  const talkToDog = (event?: { currentTarget?: HTMLElement | null }) => {
    // WebView에서 남는 포커스 테두리를 바로 해제합니다.
    event?.currentTarget?.blur()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.clearTimeout(nudgeHideTimer.current)
    const lines = [...dialogue[snapshot.stage],
      ...(foodLevel > 0 ? [
        '배달은 네가 시켰는데 배는 왜 내가 나오죠.',
        '이 배에는 이번 달 식비가 들어 있어요.',
        '치킨은 한 마리인데 영수증은 왜 세 장이죠?',
        '배부르면 기분 좋아요. 잔액도 같이 챙기면 더 좋아요.',
        '야식은 밤이 시켰대요. 나는 증인이에요.',
      ] : []),
      ...(shoppingCount >= 3 ? [
        '택배는 네 건데 선글라스는 내 거예요.',
        '나 좀 멋있죠. 잔액도 가끔 봐 줘요.',
        '상자 쌓이는 속도가 잔액 줄어드는 속도예요.',
        '무료배송 채우려고 산 거… 맞죠?',
        '개봉기 찍기 전에 잔액도 한 번 확인해 봐요.',
      ] : []),
      ...(snapshot.remainingRatio <= .5 ? [
        '영수증 끝이 안 보이는데. 이거 맞아요?',
        '이거 한 장이에요. 이어 붙인 거 아니에요.',
        '반 넘게 썼어요. 내가 세었어요.',
        '남은 돈으로 나랑 버틸 수 있겠어요?',
      ] : []),
    ]
    const candidates = lines.filter(candidate => candidate !== dogLine)
    setDogLine(candidates[Math.floor(Math.random() * candidates.length)] ?? lines[0])
    setBubbleKind('talk')
    setBubbleVisible(true)
    setDailyTalks(current => current + 1)
    setWeeklyTalks(current => current + 1)
  }
  const useSkin = (skin: typeof roomSkins[number]) => {
    if (inventory.includes(skin.id)) { setEquippedSkin(skin.id); setMessage(`${skin.name}으로 방을 바꿨어요.`); return }
    if (points < skin.price) { setMessage(`${skin.price - points}냠이 부족해요.`); return }
    setPoints(current => current - skin.price)
    setInventory(current => [...current, skin.id])
    setEquippedSkin(skin.id)
    setMessage(`${skin.name}을 구입하고 바로 적용했어요.`)
  }
  /** 추가 소품 구매 — 바로 배치되지 않고, 관련 소비 기록 시 기본 소품 풀에 섞여 쌓임 */
  const useProp = (prop: typeof roomDecorProps[number]) => {
    if (propInventory.includes(prop.id)) {
      setMessage(
        prop.kind === 'parcel'
          ? `${prop.name}은(는) 이미 있어요. 쇼핑 기록을 남기면 방에 섞여 나와요.`
          : `${prop.name}은(는) 이미 있어요. 카페·배달·외식 기록을 남기면 방에 섞여 나와요.`,
      )
      return
    }
    if (points < prop.price) {
      setMessage(`${prop.price - points}냠이 부족해요.`)
      return
    }
    setPoints(current => current - prop.price)
    setPropInventory(current => [...current, prop.id])
    setMessage(
      prop.kind === 'parcel'
        ? `${prop.name} 추가 소품을 샀어요. 쇼핑 기록을 남기면 방에 더 다양하게 쌓여요.`
        : `${prop.name} 추가 소품을 샀어요. 카페·배달·외식 기록을 남기면 방에 더 다양하게 쌓여요.`,
    )
  }
  const useOutfit = (outfit: typeof characterOutfits[number]) => {
    if (outfit.companionId !== null && outfit.companionId !== companionId) {
      setMessage('지금 선택한 눈찌가 입을 수 없는 코스튬이에요.')
      return
    }
    if (outfitInventory.includes(outfit.id)) {
      setEquippedOutfit(outfit.id)
      setMessage(outfit.id === 'none' ? '코스튬을 해제했어요.' : `${outfit.name}을(를) 착용했어요.`)
      return
    }
    if (points < outfit.price) { setMessage(`${outfit.price - points}냠이 부족해요.`); return }
    setPoints(current => current - outfit.price)
    setOutfitInventory(current => [...current, outfit.id])
    setEquippedOutfit(outfit.id)
    setMessage(`${outfit.name}을(를) 구입하고 바로 착용했어요.`)
  }

  /** 설문 모달 열기 — 처음부터 다시 */
  const openSurvey = () => {
    setSurveyIndex(0)
    setSurveyAnswers([])
    setOnboardingStep('survey')
    setNameDraft(companionName)
    setSurveyOpen(true)
  }

  /** 설문 닫기(나중에) — 진행 중 답도 버리고 홈/샵으로 */
  const closeSurvey = () => {
    setSurveyOpen(false)
    setSurveyIndex(0)
    setSurveyAnswers([])
    setOnboardingStep('survey')
  }

  /** 설문 칩 선택 → 다음 문항 또는 결과 */
  const answerSurvey = (type: SpendingType) => {
    const nextAnswers = [...surveyAnswers, type]
    setSurveyAnswers(nextAnswers)
    if (surveyIndex + 1 >= onboardingQuestions.length) {
      setOnboardingStep('result')
      return
    }
    setSurveyIndex(current => current + 1)
  }

  /** 결과에서 이름 짓기 단계로 */
  const goToNameStep = () => {
    setNameDraft(companionName || DEFAULT_COMPANION_NAME)
    setOnboardingStep('name')
  }

  /**
   * 설문 완료 — 기본 눈찌(강아지)는 설문으로 고르지 않음.
   * 결과 유형(곰/너구리/물개)만 해금·착용. 기본 눈찌는 계속 보유만 유지.
   */
  const finishOnboarding = () => {
    const type = scoreSpendingType(surveyAnswers)
    // 방어: 설문 경로로는 nunchi가 올 수 없음
    if (type !== 'foodie' && type !== 'shopper' && type !== 'subscriber') {
      setMessage('설문으로는 유형 눈찌만 만날 수 있어요.')
      return
    }
    const name = normalizeCompanionName(nameDraft)
    const title = surveyCompanions.find(item => item.id === type)?.title ?? ''
    setSpendingType(type)
    setCompanionId(type)
    setCompanionName(name)
    setOwnedCompanions(current => [...new Set<CompanionId>(['nunchi', ...current, type])])
    setEquippedOutfit('none')
    setOnboardingDone(true)
    setSurveyOpen(false)
    setMessage(`${nunchiCallsign(name, title)}(으)로 바꿨어요.`)
  }

  /**
   * 꾸미기에서 눈찌 착용/구매.
   * - 보유: 바로 교체 (이름 유지, 칭호만 변경)
   * - 미보유: COMPANION_UNLOCK_PRICE 차감 후 해금·착용
   */
  const useCompanion = (id: CompanionId) => {
    const mate = companions.find(item => item.id === id) ?? companions[0]
    const applyEquip = () => {
      setCompanionId(id)
      // 눈찌마다 체형이 달라 전용 옷만 쓸 수 있으므로 교체할 때 맨몸으로 맞춤
      if (id !== companionId && equippedOutfit !== 'none') {
        setEquippedOutfit('none')
      }
    }

    if (ownedCompanions.includes(id)) {
      applyEquip()
      setMessage(`${nunchiCallsign(companionName, mate.title)}(으)로 바꿨어요.`)
      return
    }

    if (points < COMPANION_UNLOCK_PRICE) {
      setMessage(`다른 눈찌는 ${COMPANION_UNLOCK_PRICE}냠이 필요해요. ${COMPANION_UNLOCK_PRICE - points}냠이 부족해요.`)
      return
    }

    setPoints(current => current - COMPANION_UNLOCK_PRICE)
    setOwnedCompanions(current => (current.includes(id) ? current : [...current, id]))
    applyEquip()
    setMessage(`${nunchiCallsign(companionName, mate.title)}을(를) 데려왔어요.`)
  }

  /** 리워드 광고를 끝까지 보면 100냠을 지급합니다. (userEarnedReward에서만) */
  const rewardCooldownSec = rewardAdCooldownRemainingSec(rewardAdLastAt, shopClockMs)
  const rewardAdsRemaining = Math.max(0, REWARD_AD_DAILY_LIMIT - rewardAdsToday)
  const rewardAdLimited = rewardAdsRemaining <= 0
  const rewardAdCooling = rewardCooldownSec > 0
  const rewardAdBlocked = rewardAdLimited || rewardAdCooling

  const watchRewardedAd = () => {
    if (!rewardAdSupported) {
      setMessage('토스앱에서 광고를 볼 수 있어요.')
      return
    }
    if (rewardAdLimited) {
      setMessage(`오늘은 ${REWARD_AD_DAILY_LIMIT}회까지예요. 내일 다시 받아 주세요.`)
      return
    }
    if (rewardAdCooling) {
      setMessage(`${rewardCooldownSec}초 후에 다시 볼 수 있어요.`)
      return
    }
    if (!rewardAdReady || rewardAdBusy) {
      setMessage('광고를 준비하고 있어요. 잠시만요.')
      return
    }
    rewardCycleOpenRef.current = true
    rewardAdShownRef.current = false
    setRewardAdBusy(true)
    // dismissed 미수신 대비 안전망 (최대 2분)
    window.clearTimeout(rewardBusySafetyTimer.current)
    rewardBusySafetyTimer.current = window.setTimeout(() => {
      endRewardAdCycleRef.current()
    }, 120_000)

    showFullScreenAd({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: event => {
        if (event.type === 'show' || event.type === 'impression') {
          rewardAdShownRef.current = true
        }
        if (event.type === 'userEarnedReward') {
          // 제품 정책: 1광고 = 100냠 (클릭/닫기만으로는 지급하지 않음)
          const watchedAt = Date.now()
          setPoints(current => current + REWARD_NYAM_PER_AD)
          setRewardAdsToday(current => current + 1)
          setRewardAdLastAt(watchedAt)
          setShopClockMs(watchedAt)
          setMessage(`광고 시청 완료! ${REWARD_NYAM_PER_AD}냠을 받았어요 🍪`)
        }
        if (event.type === 'dismissed' || event.type === 'failedToShow') {
          endRewardAdCycle()
        }
      },
      onError: () => {
        rewardCycleOpenRef.current = false
        rewardAdShownRef.current = false
        window.clearTimeout(rewardBusySafetyTimer.current)
        setRewardAdBusy(false)
        setRewardAdReady(false)
        setShopBannerEnabled(true)
        setMessage('광고를 열지 못했어요. 다시 시도해 주세요.')
      },
    })
  }

  const clearPeriodRecords = () => {
    if (!periodExpenses.length) return setMessage('지울 기록이 없어요.')
    const ids = new Set(periodExpenses.map(expense => expense.id))
    setExpenses(list => list.filter(expense => !ids.has(expense.id)))
    setMessage(`${periodLabel} 기록 ${periodExpenses.length}건을 비웠어요.`)
  }
  const moveMonth = (offset: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1)
    setViewMonth(next)
    setSelectedDate(dateKey(next))
  }
  const setCalendarYearMonth = (year: number, month: number) => {
    const next = new Date(year, month, 1)
    setViewMonth(next)
    setSelectedDate(dateKey(next))
  }

  const themePrimary = THEME_OPTIONS.find(item => item.id === themeId)?.primary ?? '#7EB8E8'
  const selectTheme = (id: ThemeId) => {
    setThemeId(id)
    setMessage(`${THEME_OPTIONS.find(item => item.id === id)?.label ?? ''} 테마로 바꿨어요.`)
  }
  const makeMateInvite = async () => {
    if (!isSupabaseConfigured) return setMessage('Supabase 환경변수를 먼저 연결해 주세요.')
    try {
      const created = await createMateRoom(companionName)
      setMateRoom(current => ({ ...current, roomId: created.roomId, inviteCode: created.code }))
      setMessage(`초대 코드 ${created.code}를 만들었어요.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '초대 코드를 만들지 못했어요.')
    }
  }
  const joinMateRoom = async () => {
    const code = mateCodeInput.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) return setMessage('6자리 초대 코드를 확인해 주세요.')
    try {
      const joined = await acceptMateInvite(code, companionName)
      setMateRoom(current => ({ ...current, roomId: joined.roomId, inviteCode: code, mateName: '친구 눈찌' }))
      setMateCodeInput('')
      setMessage('친구와 연결됐어요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '친구와 연결하지 못했어요.')
    }
  }
  const sendMateReaction = async (text: MateReaction) => {
    if (!mateRoom.mateName) return setMessage('먼저 친구를 초대해 주세요.')
    if (!mateRoom.roomId) return setMessage('친구 연결 상태를 다시 확인해 주세요.')
    try {
      await sendMateReactionToRoom(mateRoom.roomId, text)
    } catch (error) {
      return setMessage(error instanceof Error ? error.message : '반응을 보내지 못했어요.')
    }
    setMateRoom(current => ({
      ...current,
      reactions: [
        { id: crypto.randomUUID(), from: 'me' as const, text, createdAt: new Date().toISOString() },
        ...current.reactions,
      ].slice(0, 8),
    }))
    setMessage(`${text} 반응을 보냈어요.`)
  }
  const selectMateTheme = async (theme: MateTheme) => {
    if (!mateRoom.roomId) return setMessage('친구 연결 상태를 다시 확인해 주세요.')
    const previous = mateRoom
    const progress = mateRoom.themeProgress[theme]
    setMateRoom(current => ({ ...current, theme, ...progress }))
    try {
      await updateMateRoomTheme(mateRoom.roomId, theme)
      const [activity, mission] = await Promise.all([
        loadMateActivity(mateRoom.roomId),
        loadDailyMateMission(mateRoom.roomId),
      ])
      setMateRoom(current => ({ ...current, ...activity }))
      setDailyMateMission(mission)
      setMessage(`${theme === 'christmas' ? '크리스마스' : '캠핑'} 테마로 바꿨어요.`)
    } catch (error) {
      setMateRoom(previous)
      setMessage(error instanceof Error ? error.message : '함께 보기 테마를 바꾸지 못했어요.')
    }
  }
  const openTeamRoom = () => {
    if (!mateRoom.mateName) {
      setActivePanel('mates')
      setMessage('친구를 초대하면 두 눈찌를 함께 볼 수 있어요.')
      return
    }
    setRoomView('team')
  }
  const confirmLeaveMateRoom = async () => {
    if (!mateRoom.roomId) return
    try {
      await leaveMateRoom(mateRoom.roomId)
      setMateRoom(defaultMateRoom)
      setRoomView('personal')
      setShopTab(current => current === 'together' ? 'rooms' : current)
      setLeaveMateConfirm(false)
      setMessage('친구 연결을 끊었어요. 공유 데이터도 함께 종료됐어요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '친구 연결을 끊지 못했어요.')
    }
  }
  const openSupportEmail = () => {
    const subject = encodeURIComponent('[눈찌주는 가계부] 문의 및 의견')
    const body = encodeURIComponent(`문의 내용을 작성해 주세요.\n\n앱 버전: v${__APP_VERSION__}\n사용 기기: `)
    window.location.href = `mailto:khnam022@naver.com?subject=${subject}&body=${body}`
  }
  const issueBackupCode = async () => {
    setBackupBusy(true)
    try {
      const code = await createPersonalBackup(userHash)
      setBackupCode(code)
      setMessage('새 개인 백업 코드를 만들었어요. 안전한 곳에 보관해 주세요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '백업을 만들지 못했어요.')
    } finally {
      setBackupBusy(false)
    }
  }
  const copyBackupCode = async () => {
    if (!backupCode) return
    try {
      await navigator.clipboard.writeText(backupCode)
      setMessage('개인 백업 코드를 복사했어요.')
    } catch {
      setMessage('코드를 길게 눌러 직접 복사해 주세요.')
    }
  }
  const restoreBackup = async () => {
    if (!backupCodeInput.trim()) return setMessage('개인 백업 코드를 입력해 주세요.')
    setBackupBusy(true)
    try {
      await restorePersonalBackup(userHash, backupCodeInput)
      setMessage('복원이 끝났어요. 데이터를 다시 불러올게요.')
      window.setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '백업을 복원하지 못했어요.')
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <TDSMobileAITProvider brandPrimaryColor={themePrimary}>
    <main className={`app-shell ${activePanel === 'settings' ? 'settings-page-open' : ''}`}>
      <div className="hero-room">
        <button
          className={`hero-settings-button ${activePanel === 'settings' ? 'active' : ''}`}
          onClick={() => setActivePanel(activePanel === 'settings' ? 'expense' : 'settings')}
          type="button"
          aria-label={activePanel === 'settings' ? '설정 닫기' : '설정 열기'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16.2 11.2v-2.4l-1.8-.5a5.2 5.2 0 0 0-.6-1.3l.9-1.6L13 3.8l-1.6.9a5.2 5.2 0 0 0-1.4-.6L9.6 2.3H7.2l-.5 1.8a5.2 5.2 0 0 0-1.3.6l-1.6-.9-1.7 1.7L3 7a5.2 5.2 0 0 0-.6 1.4l-1.8.4v2.4l1.8.5c.1.5.3.9.6 1.3l-.9 1.6 1.7 1.7 1.6-.9c.4.3.8.5 1.3.6l.5 1.8h2.4l.5-1.8c.5-.1.9-.3 1.3-.6l1.6.9 1.7-1.7-.9-1.6c.3-.4.5-.8.6-1.3l1.8-.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="room-view-switch" role="tablist" aria-label="방 전환">
          <button type="button" role="tab" aria-selected={roomView === 'personal'} className={roomView === 'personal' ? 'active' : ''} onClick={() => setRoomView('personal')}>혼자</button>
          <button type="button" role="tab" aria-selected={roomView === 'team'} className={roomView === 'team' ? 'active' : ''} onClick={openTeamRoom}>같이</button>
        </div>
        {roomView === 'personal' ? (
        <section
          className={`attic stage-${snapshot.stage} ${equippedSkin !== 'attic' ? 'custom-skin' : ''}`}
          style={{ '--wear': Math.max(0, Math.min(1, 1 - snapshot.remainingRatio)) } as CSSProperties}
          aria-label={`${companionName}의 방`}
        >
          <img className="room-art room-breathe" src={roomImage} alt={`${equippedRoom.name}, 현재 ${status} 상태`} />
          {equippedSkin !== 'attic' && <div className="skin-wear" aria-hidden="true" />}
          <div className="prop-layer" aria-hidden="true">
            {deliveryPiles.map((source, index) => (
              <img className="room-prop delivery-prop" src={source} alt="" key={`food-${index}-${source}`} />
            ))}
            {parcelPiles.map((source, index) => (
              <img className="room-prop parcel-prop" src={source} alt="" key={`shopping-${index}-${source}`} />
            ))}
          </div>
          <div
            ref={dogAreaRef}
            className={`dog-wrap ${dogMotion ? `is-busy motion-${dogMotion}` : `is-wandering ${wander.moving ? 'is-moving' : 'is-idle'}`}`}
            style={{
              left: `${wander.left}%`,
              bottom: `${wander.bottom}%`,
              transitionDuration: dogMotion ? '0.35s' : `${wander.duration}s`,
            }}
          >
            {bubbleVisible && (
              <div
                className={`speech ${bubbleKind === 'nudge' ? 'is-nudge' : 'is-talk'}`}
                aria-live="polite"
              >
                <p className="speech-text">{dogLine || line}</p>
              </div>
            )}
            <div className="dog-facing" style={{ transform: `scaleX(${wander.facing})` }}>
              <div
                className="dog-button"
                role="button"
                tabIndex={0}
                aria-label={`${companionName}와 대화하기`}
                onClick={event => talkToDog(event)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    talkToDog(event)
                  }
                }}
              >
                <img
                  className="dog-art"
                  src={displayDogImage}
                  alt={`현재 ${companionName} 상태: ${status}${dogMotion === 'eat' && activeSnack ? `, ${activeSnack.label} 먹는 중` : ''}`}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </section>
        ) : mateRoom.mateName ? (
          <section className={`main-team-room party-room theme-${mateRoom.theme} ${mateMissionComplete ? 'is-calm' : 'is-alert'}`} aria-label={`${companionName}와 ${mateRoom.mateName} 함께 보기`}>
            <img className="party-room-art" src={`/assets/rooms/shared/${mateRoom.theme}/room-level-${mateRoom.roomLevel}.png`} alt={`${mateRoom.theme === 'christmas' ? '크리스마스' : '캠핑'} 함께 꾸미기 ${mateRoom.roomLevel}단계`} />
            <div className="party-consumption-props" aria-hidden="true">
              {Array.from({ length: mateFoodProps }, (_, index) => <img className="party-food-prop" style={{ '--pile-index': index } as CSSProperties} src={`/assets/rooms/shared/${mateRoom.theme}/food.png`} alt="" key={`main-team-food-${index}`} />)}
              {Array.from({ length: mateShoppingProps }, (_, index) => <img className="party-shopping-prop" style={{ '--pile-index': index } as CSSProperties} src={`/assets/rooms/shared/${mateRoom.theme}/shopping.png`} alt="" key={`main-team-shopping-${index}`} />)}
            </div>
            <div className="party-mates">
              <div><img src={displayDogImage} alt={companionName} /><span>{companionName}</span></div>
              <div><img src={mateDisplayImage} alt={`현재 ${mateRoom.mateName} 상태`} /><span>{mateRoom.mateName}</span></div>
            </div>
            <div className="main-team-status">
              <b>{dailyMateMission.title}</b>
              <span>{won(missionCurrent)}원 / {won(dailyMateMission.goal)}원</span>
            </div>
          </section>
        ) : (
          <section className="team-room-empty">
            <span aria-hidden="true">🐶　＋　?</span>
            <b>아직 연결된 친구가 없어요</b>
            <button type="button" onClick={() => setActivePanel('mates')}>친구 초대하기</button>
          </section>
        )}
      </div>

      {surveyOpen && (
        <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="소비 유형 설문">
          <div className="onboarding-card">
            <button
              type="button"
              className="onboarding-close"
              onClick={closeSurvey}
              aria-label="설문 닫기"
            >
              나중에
            </button>
            {onboardingStep === 'survey' && (
              <>
                <p className="onboarding-kicker">
                  소비 심리 테스트 · {surveyIndex + 1}/{onboardingQuestions.length}
                </p>
                <h2 className="onboarding-title">{onboardingQuestions[surveyIndex].prompt}</h2>
                <p className="onboarding-sub">
                  설문으로는 곰·너구리·물개만 만나요. 잔액지킴이(강아지)는 기본이라 여기서 고르지 않아요.
                </p>
                <div className="onboarding-chips" role="group" aria-label="선택지">
                  {onboardingQuestions[surveyIndex].options.map(option => (
                    <button
                      key={option.label}
                      type="button"
                      className="onboarding-chip"
                      onClick={() => answerSurvey(option.type)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {onboardingStep === 'result' && (
              <>
                <p className="onboarding-kicker">당신의 소비 유형</p>
                <img
                  className="onboarding-result-dog"
                  src={resultCompanion.states.neutral}
                  alt={resultCompanion.title}
                />
                <h2 className="onboarding-title">눈찌 · {resultCompanion.title}</h2>
                <p className="onboarding-sub">{resultCompanion.tagline}</p>
                <Button display="block" size="large" color="primary" onClick={goToNameStep}>
                  이 눈찌로 바꾸기
                </Button>
              </>
            )}
            {onboardingStep === 'name' && (
              <>
                <p className="onboarding-kicker">눈찌 · {resultCompanion.title}</p>
                <img
                  className="onboarding-result-dog"
                  src={resultCompanion.states.neutral}
                  alt=""
                />
                <h2 className="onboarding-title">이름을 확인해 주세요</h2>
                <p className="onboarding-sub">비워 두면 눈찌로 불러요. 꾸미기에서 언제든 바꿀 수 있어요.</p>
                <div className="onboarding-name-field">
                  <TextField
                    variant="box"
                    label="이름"
                    labelOption="sustain"
                    value={nameDraft}
                    onChange={event => setNameDraft(event.target.value.slice(0, COMPANION_NAME_MAX))}
                    placeholder={DEFAULT_COMPANION_NAME}
                    maxLength={COMPANION_NAME_MAX}
                  />
                  <p className="onboarding-name-hint">{nameDraft.trim().length}/{COMPANION_NAME_MAX}</p>
                </div>
                <Button display="block" size="large" color="primary" onClick={finishOnboarding}>
                  {normalizeCompanionName(nameDraft)} · {resultCompanion.title}로
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <section className="balance-card" aria-label="남은 생활예산">
        <p className="balance-label">이번 달 남은 돈</p>
        <p className="balance-value">{won(snapshot.remainingBalance)}원</p>
        <div className="meter">
          <span style={{ width: `${Math.max(0, Math.min(100, snapshot.remainingRatio * 100))}%` }} />
        </div>
        <p className="status-line">
          {status} · {Math.max(0, Math.round(snapshot.remainingRatio * 100))}% 남음 · 사용 {won(snapshot.totalSpent)}원
        </p>
      </section>

      {activePanel === 'expense' && (
        <section className="panel-card">
          <ListHeader title={<ListHeader.TitleParagraph>미션</ListHeader.TitleParagraph>} />
          <div className="panel-body mission-panels">
            <div className="mission-box">
              <div className="mission-heading">
                <b>일간 미션</b>
                <span>매일 자정 초기화</span>
              </div>
              {dailyMissions.map(mission => {
                const complete = claimedDaily.includes(mission.id)
                return (
                  <div className={`mission ${complete ? 'complete' : ''}`} key={mission.id}>
                    <span className="mission-check">{complete ? '✓' : `${mission.progress}/${mission.goal}`}</span>
                    <p>
                      {mission.title}
                      <small><NyamAmount amount={mission.reward} /></small>
                    </p>
                    <div>
                      <i style={{ width: `${Math.min(100, (mission.progress / mission.goal) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mission-box">
              <div className="mission-heading">
                <b>주간 미션</b>
                <span>매주 초기화</span>
              </div>
              {weeklyMissions.map(mission => {
                const complete = claimedWeekly.includes(mission.id)
                return (
                  <div className={`mission ${complete ? 'complete' : ''}`} key={mission.id}>
                    <span className="mission-check">{complete ? '✓' : `${mission.progress}/${mission.goal}`}</span>
                    <p>
                      {mission.title}
                      <small><NyamAmount amount={mission.reward} /></small>
                    </p>
                    <div>
                      <i style={{ width: `${Math.min(100, (mission.progress / mission.goal) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* 홈: 미션 아래 배너 (스크롤 구간, 화면당 1개) */}
          <BannerAdSlot slotId="home-mission" />
        </section>
      )}

      {activePanel === 'budget' && (
        <section className="panel-card">
          <ListHeader title={<ListHeader.TitleParagraph>예산 현황</ListHeader.TitleParagraph>} />
          <ListRow
            contents={<ListRow.Texts type="2RowTypeA" top="월급" bottom={`${won(plan.monthlyIncome)}원`} />}
            verticalPadding="small"
          />
          <ListRow
            contents={<ListRow.Texts type="2RowTypeA" top="생활예산" bottom={`${won(snapshot.spendableBudget)}원`} />}
            verticalPadding="small"
          />
          <ListRow
            contents={<ListRow.Texts type="2RowTypeA" top="남은 돈" bottom={`${won(snapshot.remainingBalance)}원`} />}
            verticalPadding="small"
          />
          <ListRow
            contents={<ListRow.Texts type="2RowTypeA" top="이번 달 사용" bottom={`${won(snapshot.totalSpent)}원`} />}
            verticalPadding="small"
            border="none"
          />
          <ListHeader title={<ListHeader.TitleParagraph>예산 설정</ListHeader.TitleParagraph>} />
          <form className="panel-body" onSubmit={savePlan}>
            <TextField
              variant="box"
              label="월급"
              labelOption="sustain"
              inputMode="numeric"
              value={formattedInput(draftPlan.monthlyIncome)}
              onChange={event => updatePlan('monthlyIncome', event.target.value)}
              suffix="원"
            />
            <TextField
              variant="box"
              label="매달 나가는 고정비"
              labelOption="sustain"
              inputMode="numeric"
              value={formattedInput(draftPlan.fixedExpenses)}
              onChange={event => updatePlan('fixedExpenses', event.target.value)}
              suffix="원"
            />
            <TextField
              variant="box"
              label="저축 목표"
              labelOption="sustain"
              inputMode="numeric"
              value={formattedInput(draftPlan.savingsGoal)}
              onChange={event => updatePlan('savingsGoal', event.target.value)}
              suffix="원"
            />
            <Button type="submit" display="block" size="large" color="primary">
              예산 저장하기
            </Button>
          </form>
        </section>
      )}

      {activePanel === 'mates' && (
        <section className="panel-card mate-panel">
          <ListHeader
            title={<ListHeader.TitleParagraph>같이 아끼는 방</ListHeader.TitleParagraph>}
            right={<ListHeader.RightText>매일 랜덤 미션</ListHeader.RightText>}
          />
          {!mateRoom.mateName ? (
            <div className="panel-body mate-invite-card">
              <div className="mate-room-preview" aria-hidden="true">
                <span>🐶</span><b>+</b><span className="mate-empty">?</span>
              </div>
              <h3>친구 눈찌를 초대해요</h3>
              <p>초대 코드를 수락한 두 사람만 오늘의 합산 금액과 공유한 소비 내용을 볼 수 있어요.</p>
              {mateRoom.inviteCode ? (
                <button
                  type="button"
                  className="invite-code"
                  onClick={() => void navigator.clipboard?.writeText(mateRoom.inviteCode)}
                >
                  <small>내 초대 코드 · 눌러서 복사</small>
                  <strong>{mateRoom.inviteCode}</strong>
                </button>
              ) : (
                <Button display="block" size="large" color="primary" onClick={makeMateInvite}>초대 코드 만들기</Button>
              )}
              <div className="mate-code-entry">
                <input
                  value={mateCodeInput}
                  onChange={event => setMateCodeInput(event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase())}
                  placeholder="받은 코드 6자리"
                  aria-label="친구 초대 코드"
                />
                <button type="button" onClick={joinMateRoom}>참여</button>
              </div>
              <p className="mate-consent-note">참여하면 오늘의 합산 소비와 공유 설정을 켠 소비 메모가 서로에게 보여요.</p>
            </div>
          ) : (
            <div className="panel-body">
              <button type="button" className="open-main-team-room" onClick={() => { setRoomView('team'); setActivePanel('expense') }}>
                <span><b>{companionName} + {mateRoom.mateName}</b><small>{mateRoom.theme === 'christmas' ? '크리스마스' : '캠핑'} · {mateRoom.roomLevel}단계</small></span>
                <strong>함께 보기</strong>
              </button>

              <div className="mate-level-card">
                <p><b>함께 꾸미기 {mateRoom.roomLevel}단계</b><span>{mateRoom.successDays}일 성공</span></p>
                <i><em style={{ width: `${mateLevelProgress}%` }} /></i>
                <small>{mateRoom.roomLevel >= 4 ? '함께 쓰는 공간을 완성했어요.' : `${nextMateLevelDays - mateRoom.successDays}일 더 성공하면 다음 단계`}</small>
              </div>

              <div className={`mate-daily-challenge ${mateMissionComplete ? 'is-safe' : 'is-over'}`}>
                <p><b>오늘의 공동 미션</b><span>{mateMissionComplete ? '진행 중' : '한도 초과'}</span></p>
                <strong>{dailyMateMission.title}</strong>
                <i><em style={{ width: `${mateMissionProgress}%` }} /></i>
                <small>{won(missionCurrent)}원 / {won(dailyMateMission.goal)}원 · 결과는 내일 확정돼요</small>
              </div>

              <div className="mate-total-card">
                <small>오늘 둘이 쓴 돈</small>
                <strong>{won(todaySpent + mateRoom.mateSpentToday)}원</strong>
                <span>{won(DAILY_MATE_LIMIT * 2)}원 중 {won(Math.max(0, DAILY_MATE_LIMIT * 2 - todaySpent - mateRoom.mateSpentToday))}원 남음</span>
              </div>

              <div className="mate-progress-list">
                <div className={todaySpent > DAILY_MATE_LIMIT ? 'is-over' : ''}>
                  <p><b>{companionName}</b><span>{won(todaySpent)}원</span></p>
                  <i><em style={{ width: `${myMateProgress}%` }} /></i>
                </div>
                <div className={mateRoom.mateSpentToday > DAILY_MATE_LIMIT ? 'is-over' : ''}>
                  <p><b>{mateRoom.mateName}</b><span>{won(mateRoom.mateSpentToday)}원</span></p>
                  <i><em style={{ width: `${friendMateProgress}%` }} /></i>
                </div>
              </div>

              <label className="mate-share-toggle">
                <span><b>소비 내용 공유</b><small>카테고리와 내가 적은 사용처만 보여요</small></span>
                <input
                  type="checkbox"
                  checked={mateRoom.shareDetails}
                  onChange={event => setMateRoom(current => ({ ...current, shareDetails: event.target.checked }))}
                />
              </label>

              {mateRoom.shareDetails && (
                <div className="mate-feed">
                  <h3>오늘 뭐 썼지?</h3>
                  {expenses
                    .filter(expense => new Date(expense.spentAt).toLocaleDateString('en-CA') === todayKey)
                    .slice(0, 4)
                    .map(expense => (
                      <div key={expense.id}>
                        <span>{categoryInfo(expense.category).emoji}</span>
                        <p><b>{expense.memo || categoryInfo(expense.category).label}</b><small>{companionName}</small></p>
                        <strong>{won(expense.amount)}원</strong>
                      </div>
                    ))}
                  {todayExpenseCount === 0 && <p className="mate-empty-copy">아직 오늘 기록한 소비가 없어요.</p>}
                  {mateRoom.mateRecentExpenses.map((expense, index) => (
                    <div key={`mate-${index}-${expense.category}-${expense.amount}`}>
                      <span>{categoryInfo(expense.category).emoji}</span>
                      <p><b>{expense.memo || categoryInfo(expense.category).label}</b><small>{mateRoom.mateName}</small></p>
                      <strong>{won(expense.amount)}원</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="mate-reactions">
                <h3>눈찌 반응 보내기</h3>
                <div>{mateReactions.map(reaction => <button type="button" key={reaction} onClick={() => void sendMateReaction(reaction)}>{reaction}</button>)}</div>
              </div>

              <div className="mate-danger-zone">
                {!leaveMateConfirm ? (
                  <button type="button" className="mate-leave-button" onClick={() => setLeaveMateConfirm(true)}>친구 연결 끊기</button>
                ) : (
                  <div className="mate-leave-confirm" role="alert">
                    <p><b>정말 친구 연결을 끊을까요?</b><span>한 명이 끊으면 둘이 공유하던 기록도 함께 종료돼요.</span></p>
                    <div>
                      <button type="button" onClick={() => setLeaveMateConfirm(false)}>취소</button>
                      <button type="button" className="danger" onClick={() => void confirmLeaveMateRoom()}>나가기</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {activePanel === 'history' && (
        <section className="panel-card">
          <ListHeader
            title={<ListHeader.TitleParagraph>소비 내역</ListHeader.TitleParagraph>}
            right={<ListHeader.RightText>{expenses.length}건</ListHeader.RightText>}
          />
          <div className="segment three">
            <button className={historyView === 'calendar' ? 'active' : ''} onClick={() => setHistoryView('calendar')} type="button">
              달력
            </button>
            <button className={historyView === 'list' ? 'active' : ''} onClick={() => setHistoryView('list')} type="button">
              리스트
            </button>
            <button className={historyView === 'report' ? 'active' : ''} onClick={() => setHistoryView('report')} type="button">
              리포트
            </button>
          </div>

          {historyView === 'report' ? (
            <div className="spending-report">
              <div className="calendar-head">
                <button onClick={() => { const prev = new Date(listYear, listMonth - 1, 1); setListYear(prev.getFullYear()); setListMonth(prev.getMonth()) }} aria-label="이전 달" type="button">‹</button>
                <strong>{listYear}년 {listMonth + 1}월 소비 리포트</strong>
                <button onClick={() => { const next = new Date(listYear, listMonth + 1, 1); setListYear(next.getFullYear()); setListMonth(next.getMonth()) }} aria-label="다음 달" type="button">›</button>
              </div>

              <div className="report-hero">
                <span>이번 달 총지출</span>
                <strong>{won(reportTotal)}원</strong>
                <p>
                  {reportChange === null
                    ? '지난달 비교 데이터가 아직 없어요'
                    : reportChange === 0
                      ? '지난달과 같은 금액이에요'
                      : `지난달보다 ${Math.abs(reportChange)}% ${reportChange > 0 ? '더 썼어요' : '덜 썼어요'}`}
                </p>
                <div className="report-budget-track" aria-label={`생활예산의 ${reportBudgetRatio}% 사용`}>
                  <i style={{ width: `${Math.min(100, reportBudgetRatio)}%` }} />
                </div>
                <small>생활예산의 {reportBudgetRatio}% 사용</small>
              </div>

              <div className="report-stats">
                <article><span>하루 평균</span><b>{won(reportDailyAverage)}원</b></article>
                <article><span>무지출 일수</span><b>{reportNoSpendDays}일</b></article>
                <article><span>기록 건수</span><b>{reportMonthExpenses.length}건</b></article>
                <article><span>가장 많이 쓴 날</span><b>{reportTopDay ? `${Number(reportTopDay[0].slice(-2))}일` : '-'}</b></article>
              </div>

              <section className="report-section">
                <h3>어디에 많이 썼을까?</h3>
                {reportCategoryRows.length === 0 ? (
                  <p className="empty">분석할 소비 기록이 없어요.</p>
                ) : reportCategoryRows.map(row => {
                  const ratio = reportTotal > 0 ? Math.round((row.amount / reportTotal) * 100) : 0
                  return (
                    <div className="report-category" key={row.value}>
                      <span className="category-icon">{row.emoji}</span>
                      <div>
                        <p><b>{row.label}</b><small>{ratio}%</small></p>
                        <i><em style={{ width: `${ratio}%` }} /></i>
                      </div>
                      <strong>{won(row.amount)}원</strong>
                    </div>
                  )
                })}
              </section>

              <div className="report-comment">
                <img src={activeCompanion.states.neutral} alt="" />
                <p><b>{companionName}의 한마디</b>{reportComment}</p>
              </div>
            </div>
          ) : historyView === 'calendar' ? (
            <>
              <div className="period-pickers" aria-label="달력 연월 선택">
                <label>
                  연도
                  <select className="native-select" value={viewMonth.getFullYear()} onChange={event => setCalendarYearMonth(Number(event.target.value), viewMonth.getMonth())}>
                    {listYears.map(year => (
                      <option value={year} key={year}>{year}년</option>
                    ))}
                  </select>
                </label>
                <label>
                  월
                  <select className="native-select" value={viewMonth.getMonth()} onChange={event => setCalendarYearMonth(viewMonth.getFullYear(), Number(event.target.value))}>
                    {Array.from({ length: 12 }, (_, month) => (
                      <option value={month} key={month}>{month + 1}월</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="calendar-head">
                <button onClick={() => moveMonth(-1)} aria-label="이전 달" type="button">‹</button>
                <strong>{viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월</strong>
                <button onClick={() => moveMonth(1)} aria-label="다음 달" type="button">›</button>
              </div>
              <div className="weekdays">
                <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
              </div>
              <div className="calendar-grid">
                {calendarCells.map((day, index) => {
                  if (!day) return <span className="calendar-blank" key={`blank-${index}`} />
                  const key = dateKey(day)
                  const dayExpenses = expensesByDate[key] ?? []
                  const isSelected = key === selectedDate
                  const isToday = key === todayKey
                  return (
                    <button
                      className={`${isSelected ? 'selected ' : ''}${isToday ? 'today' : ''}`}
                      onClick={() => setSelectedDate(key)}
                      key={key}
                      type="button"
                    >
                      <span className="day-number">{day.getDate()}</span>
                      <span className="day-icons">
                        {dayExpenses.slice(0, 3).map(expense => (
                          <i key={expense.id}>{categoryInfo(expense.category).emoji}</i>
                        ))}
                        {dayExpenses.length > 3 && <small>+{dayExpenses.length - 3}</small>}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="day-summary">
                <div>
                  <b>{selectedBaseDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</b>
                  <small>{selectedExpenses.length}건</small>
                </div>
                <strong>{won(selectedTotal)}원</strong>
              </div>
              {selectedExpenses.length === 0 ? (
                <div className="empty-state">
                  <p className="empty">이날은 기록이 없어요.</p>
                  <Button
                    display="block"
                    size="medium"
                    color="primary"
                    onClick={() => openExpenseSheet(selectedDate)}
                  >
                    기록 추가하기
                  </Button>
                </div>
              ) : (
                <ul className="expense-list">
                  {selectedExpenses.map(expense => {
                    const info = categoryInfo(expense.category)
                    return (
                      <li key={expense.id}>
                        <span className="category-icon">{info.emoji}</span>
                        <div>
                          <b>{expense.memo}</b>
                          <small>{info.label}</small>
                        </div>
                        <strong>-{won(expense.amount)}원</strong>
                        <button
                          aria-label={`${expense.memo} 삭제`}
                          type="button"
                          onClick={() => setExpenses(list => list.filter(x => x.id !== expense.id))}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : (
            <>
              <div className="calendar-head">
                <button
                  onClick={() => {
                    const previous = new Date(listYear, listMonth - 1, 1)
                    setListYear(previous.getFullYear())
                    setListMonth(previous.getMonth())
                    setListPeriod('monthly')
                  }}
                  aria-label="이전 달"
                  type="button"
                >
                  ‹
                </button>
                <strong>{listYear}년 {listMonth + 1}월</strong>
                <button
                  onClick={() => {
                    const next = new Date(listYear, listMonth + 1, 1)
                    setListYear(next.getFullYear())
                    setListMonth(next.getMonth())
                    setListPeriod('monthly')
                  }}
                  aria-label="다음 달"
                  type="button"
                >
                  ›
                </button>
              </div>
              <div className="period-pickers full">
                <label>
                  유형
                  <select
                    className="native-select"
                    value={listCategory}
                    onChange={event => setListCategory(event.target.value as 'all' | ExpenseCategory)}
                  >
                    <option value="all">전체 유형</option>
                    {categories.map(info => (
                      <option value={info.value} key={info.value}>
                        {info.emoji} {info.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="day-summary">
                <div>
                  <b>{listYear}년 {listMonth + 1}월</b>
                  <small>
                    {visibleListExpenses.length}건 · {listCategory === 'all' ? '전체' : categoryInfo(listCategory).label}
                  </small>
                </div>
                <strong>{won(listTotal)}원</strong>
              </div>
              {visibleListExpenses.length === 0 ? (
                <div className="empty-state">
                  <p className="empty">이번 달 기록이 없어요.</p>
                  <Button
                    display="block"
                    size="medium"
                    color="primary"
                    onClick={() => openExpenseSheet()}
                  >
                    기록 추가하기
                  </Button>
                </div>
              ) : (
                <>
                  <ul className="expense-list">
                    {visibleListExpenses.map(expense => {
                      const info = categoryInfo(expense.category)
                      return (
                        <li key={expense.id}>
                          <span className="category-icon">{info.emoji}</span>
                          <div>
                            <b>{expense.memo}</b>
                            <small>{info.label} · {new Date(expense.spentAt).toLocaleDateString('ko-KR')}</small>
                          </div>
                          <strong>-{won(expense.amount)}원</strong>
                          <button
                            aria-label={`${expense.memo} 삭제`}
                            type="button"
                            onClick={() => setExpenses(list => list.filter(x => x.id !== expense.id))}
                          >
                            ×
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="action-row">
                    <Button
                      display="block"
                      size="medium"
                      color="dark"
                      variant="weak"
                      onClick={clearPeriodRecords}
                    >
                      이달 기록 비우기
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {activePanel === 'shop' && (
        <section className="panel-card">
          {/* 꾸미기 상단: 리워드 광고 → 100냠 */}
          <div className="ad-reward-card">
            <div className="ad-reward-copy">
              <b>광고 보고 냠 받기</b>
              <p>
                끝까지 보면 <NyamAmount amount={REWARD_NYAM_PER_AD} /> · 하루 {REWARD_AD_DAILY_LIMIT}회 · 5초 쿨다운
              </p>
              <p className="ad-reward-meta">
                {rewardAdLimited
                  ? '오늘 한도를 모두 썼어요'
                  : `오늘 남은 횟수 ${rewardAdsRemaining}/${REWARD_AD_DAILY_LIMIT}`}
              </p>
            </div>
            <Button
              display="block"
              size="medium"
              color="primary"
              loading={rewardAdBusy}
              disabled={
                rewardAdBusy
                || rewardAdBlocked
                || (rewardAdSupported && !rewardAdReady)
              }
              onClick={watchRewardedAd}
            >
              {!rewardAdSupported
                ? '토스앱에서 볼 수 있어요'
                : rewardAdLimited
                  ? '오늘 한도 끝'
                  : rewardAdCooling
                    ? `${rewardCooldownSec}초 후 다시`
                    : rewardAdReady
                      ? `광고 보고 ${REWARD_NYAM_PER_AD}냠 받기`
                      : '광고 준비 중…'}
            </Button>
          </div>
          <ListHeader
            title={<ListHeader.TitleParagraph>꾸미기</ListHeader.TitleParagraph>}
            right={<ListHeader.RightText><NyamAmount amount={points} /></ListHeader.RightText>}
          />
          <p className="shop-guide">
            지금: {nunchiCallsign(companionName, activeCompanion.title)}
            {spendingType ? ` (설문 ${companions.find(item => item.id === spendingType)?.title})` : ''}
            . 방·코스튬·소품·눈찌를 바꿀 수 있어요.
          </p>
          <div className={`segment ${mateRoom.mateName ? 'five' : 'four'}`}>
            <button className={shopTab === 'rooms' ? 'active' : ''} onClick={() => setShopTab('rooms')} type="button">
              방 스킨
            </button>
            <button className={shopTab === 'outfits' ? 'active' : ''} onClick={() => setShopTab('outfits')} type="button">
              코스튬
            </button>
            <button className={shopTab === 'props' ? 'active' : ''} onClick={() => setShopTab('props')} type="button">
              소품
            </button>
            <button className={shopTab === 'companions' ? 'active' : ''} onClick={() => setShopTab('companions')} type="button">
              눈찌
            </button>
            {mateRoom.mateName && (
              <button className={shopTab === 'together' ? 'active' : ''} onClick={() => setShopTab('together')} type="button">
                같이
              </button>
            )}
          </div>
          {shopTab === 'rooms' ? (
            <div className="skin-grid">
              {roomSkins.map(skin => {
                const owned = inventory.includes(skin.id)
                const equipped = equippedSkin === skin.id
                return (
                  <article key={skin.id} className={equipped ? 'equipped' : ''}>
                    <img src={skin.image} alt={skin.name} />
                    <div>
                      <h3>{skin.name}</h3>
                      <p>{skin.description}</p>
                    </div>
                    <Button
                      className="skin-cta"
                      display="block"
                      size="small"
                      color={equipped ? 'dark' : 'primary'}
                      variant={equipped ? 'weak' : 'fill'}
                      disabled={equipped}
                      onClick={() => useSkin(skin)}
                    >
                      {equipped ? '사용 중' : owned ? '사용하기' : <NyamAmount amount={skin.price} />}
                    </Button>
                  </article>
                )
              })}
            </div>
          ) : shopTab === 'outfits' ? (
            <div className="skin-grid outfit-grid">
              {availableOutfits.map(outfit => {
                const owned = outfitInventory.includes(outfit.id)
                const equipped = equippedOutfit === outfit.id
                return (
                  <article key={outfit.id} className={equipped ? 'equipped' : ''}>
                    <img src={outfit.image ?? activeCompanion.states.neutral} alt={outfit.name} />
                    <div>
                      <h3>{outfit.name}</h3>
                      <p>{outfit.description}</p>
                    </div>
                    <Button
                      className="skin-cta"
                      display="block"
                      size="small"
                      color={equipped ? 'dark' : 'primary'}
                      variant={equipped ? 'weak' : 'fill'}
                      disabled={equipped}
                      onClick={() => useOutfit(outfit)}
                    >
                      {equipped
                          ? '착용 중'
                          : owned
                            ? '착용하기'
                            : <NyamAmount amount={outfit.price} />}
                    </Button>
                  </article>
                )
              })}
            </div>
          ) : shopTab === 'props' ? (
            <>
              <p className="shop-lock-hint">
                배달 봉투·택배 상자는 기본으로 쌓여요.
                추가 소품을 사면 기록할 때 <b>랜덤</b>으로 더 나와요.
              </p>
              <div className="skin-grid outfit-grid prop-grid">
                {roomDecorProps.map(prop => {
                  const owned = propInventory.includes(prop.id)
                  return (
                    <article key={prop.id} className={owned ? 'equipped' : ''}>
                      <img src={prop.image} alt={prop.name} />
                      <div>
                        <h3>{prop.name}</h3>
                        <p>{prop.description}</p>
                      </div>
                      <Button
                        className="skin-cta"
                        display="block"
                        size="small"
                        color={owned ? 'dark' : 'primary'}
                        variant={owned ? 'weak' : 'fill'}
                        disabled={owned}
                        onClick={() => useProp(prop)}
                      >
                        {owned ? '보유 중' : <NyamAmount amount={prop.price} />}
                      </Button>
                    </article>
                  )
                })}
              </div>
            </>
          ) : shopTab === 'together' && mateRoom.mateName ? (
            <div className="together-theme-shop">
              <p className="shop-lock-hint">
                테마마다 미션 성공 일수와 성장 단계가 따로 쌓여요. 다른 테마로 바꿔도 이전 진행도는 그대로 남아요.
              </p>
              {(['christmas', 'camping'] as MateTheme[]).map(theme => {
                const progress = mateRoom.themeProgress[theme]
                const active = mateRoom.theme === theme
                const title = theme === 'christmas' ? '크리스마스' : '캠프파이어'
                return (
                  <article className={`together-theme-card ${active ? 'equipped' : ''}`} key={theme}>
                    <img src={`/assets/rooms/shared/${theme}/room-level-${progress.roomLevel}.png`} alt={`${title} ${progress.roomLevel}단계`} />
                    <div>
                      <p><b>{title}</b><span>{progress.roomLevel}단계 · {progress.successDays}일 성공</span></p>
                      <small>{progress.roomLevel >= 4 ? '완성된 테마예요.' : `${progress.roomLevel === 1 ? 3 : progress.roomLevel === 2 ? 7 : 14}일 성공하면 다음 모습으로 변해요.`}</small>
                    </div>
                    <Button display="block" size="small" color={active ? 'dark' : 'primary'} variant={active ? 'weak' : 'fill'} disabled={active} onClick={() => void selectMateTheme(theme)}>
                      {active ? '사용 중' : progress.successDays > 0 ? '이어하기' : '새로 시작'}
                    </Button>
                  </article>
                )
              })}
            </div>
          ) : (
            <>
              <div className="companion-name-edit">
                <TextField
                  variant="box"
                  label="눈찌 이름"
                  labelOption="sustain"
                  value={companionName}
                  onChange={event => setCompanionName(event.target.value.slice(0, COMPANION_NAME_MAX))}
                  onBlur={() => setCompanionName(normalizeCompanionName(companionName))}
                  placeholder={DEFAULT_COMPANION_NAME}
                  maxLength={COMPANION_NAME_MAX}
                />
              </div>
              <p className="shop-lock-hint">
                <b>잔액지킴이(강아지)</b>는 기본 지급이라 설문으로 고르지 않아요.
                {!onboardingDone
                  ? ' 설문은 곰·너구리·물개 유형만 만나요.'
                  : ' 다른 유형 눈찌는 약 일주일치 '}
                {onboardingDone && (
                  <>
                    <b><NyamAmount amount={COMPANION_UNLOCK_PRICE} /></b>을 모으면 데려올 수 있어요.
                  </>
                )}
              </p>
              {!onboardingDone && (
                <div className="survey-cta-wrap">
                  <Button display="block" size="medium" color="primary" onClick={openSurvey}>
                    소비 유형 테스트하고 눈찌 바꾸기
                  </Button>
                </div>
              )}
              {onboardingDone && (
                <div className="survey-cta-wrap">
                  <Button display="block" size="medium" color="dark" variant="weak" onClick={openSurvey}>
                    유형 테스트 다시 하기
                  </Button>
                </div>
              )}
              <div className="skin-grid outfit-grid">
                {companions.map(mate => {
                  const equipped = companionId === mate.id
                  const owned = ownedCompanions.includes(mate.id)
                  return (
                    <article
                      key={mate.id}
                      className={[equipped ? 'equipped' : '', !owned ? 'is-locked' : ''].filter(Boolean).join(' ')}
                    >
                      <img src={mate.states.neutral} alt={nunchiCallsign(companionName, mate.title)} />
                      <div>
                        <h3>{nunchiCallsign(companionName, mate.title)}</h3>
                        <p>
                          {mate.id === 'nunchi'
                            ? '기본 눈찌 · 언제든 함께할 수 있어요.'
                            : owned
                              ? mate.tagline
                              : '아직 만나지 못한 눈찌예요.'}
                        </p>
                      </div>
                      <Button
                        className="skin-cta"
                        display="block"
                        size="small"
                        color={equipped ? 'dark' : 'primary'}
                        variant={equipped ? 'weak' : 'fill'}
                        disabled={equipped}
                        onClick={() => useCompanion(mate.id)}
                      >
                        {equipped
                          ? '함께 중'
                          : owned
                            ? '이 눈찌로'
                            : <NyamAmount amount={COMPANION_UNLOCK_PRICE} />}
                      </Button>
                    </article>
                  )
                })}
              </div>
            </>
          )}
          {/* 꾸미기: 상품 목록 아래 배너 (상단 리워드 CTA와 분리) */}
          {/* 리워드 loaded/실패 후에만 마운트 — Android 배너·리워드 동시 로드 누락 방지 */}
          {shopBannerEnabled ? <BannerAdSlot slotId="shop-list" /> : null}
        </section>
      )}

      {activePanel === 'settings' && (
        <section className="panel-card settings-panel">
          <header className="settings-page-header">
            <button type="button" onClick={() => setActivePanel('expense')} aria-label="설정 닫고 돌아가기">‹</button>
            <h2>설정</h2>
            <span>눈찌주는 가계부</span>
          </header>

          <section className="settings-section">
            <h3>화면 테마</h3>
            <p>버튼과 강조색을 취향대로 바꿔요.</p>
            <div className="theme-picker" role="radiogroup" aria-label="UI 테마 색상">
              {THEME_OPTIONS.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={themeId === theme.id}
                  className={`theme-swatch ${themeId === theme.id ? 'is-active' : ''}`}
                  onClick={() => selectTheme(theme.id)}
                >
                  <i className={`theme-swatch-dot is-${theme.id}`} aria-hidden="true" />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <button className="settings-row" type="button" onClick={() => setGuideExpanded(value => !value)} aria-expanded={guideExpanded}>
              <span><b>사용법 보기</b><small>처음 시작하는 순서를 확인해요.</small></span>
              <strong>{guideExpanded ? '접기' : '보기'}</strong>
            </button>
            {guideExpanded && (
              <ol className="inline-guide">
                <li><i>1</i><p><b>눈찌 고르기</b><span>꾸미기에서 함께할 눈찌를 선택하고 이름을 붙여요.</span></p></li>
                <li><i>2</i><p><b>생활예산 설정</b><span>월급에서 고정비와 저축 목표를 빼 실제로 쓸 돈을 정해요.</span></p></li>
                <li><i>3</i><p><b>소비 기록</b><span>종류와 금액을 기록하면 눈찌와 방이 소비에 반응해요.</span></p></li>
                <li><i>4</i><p><b>리포트 확인</b><span>내역의 리포트에서 지난달 비교와 소비 비중을 확인해요.</span></p></li>
              </ol>
            )}
          </section>

          <section className="settings-section">
            <button className="settings-row" type="button" onClick={openSupportEmail}>
              <span><b>문의 또는 의견 보내기</b><small>메일 앱에서 내용을 작성해 보내요.</small></span>
              <strong>메일 열기</strong>
            </button>
          </section>

          <section className="settings-section backup-section">
            <h3>개인 백업</h3>
            <p>기기를 바꾸거나 앱 데이터가 지워졌을 때 이 코드로 복원할 수 있어요.</p>
            <button className="settings-row" type="button" disabled={backupBusy} onClick={() => void issueBackupCode()}>
              <span><b>새 백업 코드 만들기</b><small>현재 데이터를 암호화해서 1년간 보관해요.</small></span>
              <strong>{backupBusy ? '처리 중' : '발급'}</strong>
            </button>
            {backupCode && (
              <div className="backup-code-box">
                <code>{backupCode}</code>
                <button type="button" onClick={() => void copyBackupCode()}>코드 복사</button>
              </div>
            )}
            <div className="backup-restore-row">
              <input
                value={backupCodeInput}
                onChange={event => setBackupCodeInput(event.target.value)}
                placeholder="NUN-으로 시작하는 백업 코드"
                aria-label="개인 백업 코드"
              />
              <button type="button" disabled={backupBusy} onClick={() => void restoreBackup()}>복원</button>
            </div>
            <p className="backup-warning">이 코드는 비밀번호와 같아요. 다른 사람에게 보내지 말고, 잃어버리면 복구할 수 없어요.</p>
          </section>

          <p className="app-version">눈찌주는 가계부 · v{__APP_VERSION__}</p>
        </section>
      )}

      {message && (
        <p className="toast" role="status">
          {message}
        </p>
      )}

      {!expenseSheetOpen && activePanel !== 'settings' && (
        <button
          className="fab-add"
          type="button"
          aria-label="기록 추가하기"
          onClick={() => openExpenseSheet()}
        >
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <BottomSheet
        open={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        onDimmerClick={() => setExpenseSheetOpen(false)}
        hasTextField
        header={<BottomSheet.Header>소비 기록</BottomSheet.Header>}
        cta={
          <BottomSheet.CTA
            color="primary"
            onClick={() => {
              const form = document.getElementById('expense-sheet-form') as HTMLFormElement | null
              form?.requestSubmit()
            }}
          >
            기록하기
          </BottomSheet.CTA>
        }
      >
        <div className="expense-sheet-frame">
          <form id="expense-sheet-form" className="expense-sheet-form" onSubmit={saveExpense}>
            {/* 0. 결제 문자 붙여넣기 → 금액/메모 자동 채움 */}
            <section className="expense-section" aria-label="결제 문자 붙여넣기">
              <p className="expense-section-label">결제 문자 붙여넣기</p>
              <textarea
                className="sms-paste"
                value={smsPaste}
                onChange={event => setSmsPaste(event.target.value)}
                placeholder={'예: 신한 03/17 15:30 승인 12,000원 스타벅스'}
                rows={3}
              />
              <button
                type="button"
                className="sms-paste-apply"
                disabled={!smsPaste.trim()}
                onClick={applySmsPaste}
              >
                불러오기
              </button>
            </section>

            {/* 1. 날짜 — 오늘/어제 뱃지 + 달력 선택 */}
            <section className="expense-section" aria-label="소비 날짜">
              <p className="expense-section-label">날짜</p>
              <div className="expense-date-badges" role="group" aria-label="소비 날짜 선택">
                {(() => {
                  const liveToday = dateKey(new Date())
                  const yesterday = shiftDateKey(liveToday, -1)
                  const isToday = expenseDate === liveToday
                  const isYesterday = expenseDate === yesterday
                  const isCustom = !isToday && !isYesterday
                  return (
                    <>
                      <button
                        type="button"
                        className={`expense-date-badge ${isToday ? 'active' : ''}`}
                        aria-pressed={isToday}
                        onClick={() => setExpenseDate(liveToday)}
                      >
                        오늘
                      </button>
                      <button
                        type="button"
                        className={`expense-date-badge ${isYesterday ? 'active' : ''}`}
                        aria-pressed={isYesterday}
                        onClick={() => setExpenseDate(yesterday)}
                      >
                        어제
                      </button>
                      <label
                        className={`expense-date-badge expense-date-picker ${isCustom ? 'active' : ''}`}
                      >
                        <input
                          type="date"
                          value={expenseDate}
                          max={liveToday}
                          onChange={event => {
                            const next = event.target.value
                            if (next) setExpenseDate(next)
                          }}
                          aria-label="날짜 직접 선택"
                        />
                        <span>{isCustom ? formatDateBadge(expenseDate) : '다른 날'}</span>
                      </label>
                    </>
                  )
                })()}
              </div>
            </section>

            {/* 2. 종류 — 줄바꿈 칩 */}
            <section className="expense-section" aria-label="소비 종류">
              <p className="expense-section-label">종류</p>
              <div className="category-scroll" role="listbox" aria-label="소비 종류 선택">
                {categories.map(x => (
                  <button
                    key={x.value}
                    type="button"
                    role="option"
                    aria-selected={category === x.value}
                    className={`category-chip ${category === x.value ? 'active' : ''}`}
                    onClick={() => setCategory(x.value)}
                  >
                    <span aria-hidden="true">{x.emoji}</span>
                    {x.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. 금액 — 큰 입력 + 빠른 추가 */}
            <section className="expense-section" aria-label="사용 금액">
              <p className="expense-section-label">금액</p>
              <label className="expense-amount-field">
                <input
                  className="expense-amount-input"
                  inputMode="numeric"
                  value={formattedInput(amount)}
                  onChange={event => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  aria-label="사용 금액"
                />
                <span className="expense-amount-unit">원</span>
              </label>
              <div className="expense-quick-chips" aria-label="금액 빠르게 더하기">
                <button type="button" onClick={() => addQuickAmount(100_000)}>+10만</button>
                <button type="button" onClick={() => addQuickAmount(10_000)}>+1만</button>
                <button type="button" onClick={() => addQuickAmount(1_000)}>+1천</button>
                <button type="button" className="is-clear" onClick={() => setAmount('')}>초기화</button>
              </div>
            </section>

            {/* 4. 메모 — 한 줄 */}
            <section className="expense-section" aria-label="사용처">
              <TextField
                variant="box"
                label="어디에 썼나요? (선택)"
                labelOption="sustain"
                value={memo}
                onChange={event => setMemo(event.target.value)}
                placeholder="비워도 저장돼요"
                maxLength={40}
              />
            </section>
          </form>
        </div>
      </BottomSheet>

      <nav className="floating-tab" aria-label="가계부 메뉴">
        <button className={activePanel === 'expense' ? 'active' : ''} onClick={() => setActivePanel('expense')} type="button">
          <span className="tab-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3.5 8.5 10 3l6.5 5.5V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="tab-label">홈</span>
        </button>
        <button className={activePanel === 'budget' ? 'active' : ''} onClick={() => setActivePanel('budget')} type="button">
          <span className="tab-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6.5v7M8 8.2c.5-.6 1.2-.9 2-.9 1.2 0 2.1.7 2.1 1.8S11.2 11 10 11s-2.2.6-2.2 1.7c0 1.1.9 1.8 2.2 1.8.8 0 1.5-.3 2-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="tab-label">예산</span>
        </button>
        <button className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')} type="button">
          <span className="tab-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5.5h10M5 10h10M5 14.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="tab-label">내역</span>
        </button>
        <button className={activePanel === 'mates' ? 'active' : ''} onClick={() => setActivePanel('mates')} type="button">
          <span className="tab-icon" aria-hidden="true">♡</span>
          <span className="tab-label">같이</span>
        </button>
        <button className={activePanel === 'shop' ? 'active' : ''} onClick={() => setActivePanel('shop')} type="button">
          <span className="tab-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 7.5h10l-.8 7.2a1.5 1.5 0 0 1-1.5 1.3H7.3a1.5 1.5 0 0 1-1.5-1.3L5 7.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="tab-label">꾸미기</span>
        </button>
      </nav>
    </main>
    </TDSMobileAITProvider>
  )
}

