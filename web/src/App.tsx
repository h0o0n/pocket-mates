import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { calculateBudget } from './domain/index.ts'
import type { BudgetPlan, Expense, ExpenseCategory } from './domain/types.ts'

const defaultPlan: BudgetPlan = { monthlyIncome: 3_000_000, fixedExpenses: 1_000_000, savingsGoal: 500_000 }
const categories: Array<{ value: ExpenseCategory; label: string; emoji: string }> = [
  { value: 'coffee', label: '카페·커피', emoji: '☕' }, { value: 'delivery', label: '배달', emoji: '🍕' },
  { value: 'dining', label: '외식', emoji: '🍚' }, { value: 'transport', label: '교통', emoji: '🚌' },
  { value: 'shopping', label: '쇼핑', emoji: '📦' }, { value: 'game', label: '게임', emoji: '🎮' },
  { value: 'subscription', label: '구독', emoji: '📺' }, { value: 'living', label: '생활', emoji: '🧻' },
  { value: 'other', label: '기타', emoji: '✏️' },
]
const copy = {
  relaxed: ['평화로움', '이번 달은 아직 창밖을 볼 여유가 있다.'],
  watching: ['슬슬 보는 중', '방금 그 결제, 꼭 필요했던 거 맞지?'],
  calculating: ['계산기 등장', '강아지가 영수증을 모으기 시작했다.'],
  worried: ['집안 사정 회의', '전등 하나 끄면 해결되는 문제인가.'],
  speechless: ['말을 잃음', '강아지와 방이 동시에 낡아가고 있다.'],
} as const
const roomImages = {
  relaxed: '/assets/rooms/budget-states/attic-cozy.png',
  watching: '/assets/rooms/budget-states/attic-lived-in.png',
  calculating: '/assets/rooms/budget-states/attic-worn.png',
  worried: '/assets/rooms/budget-states/attic-struggling.png',
  speechless: '/assets/rooms/budget-states/attic-broke.png',
} as const
type SkinId = 'attic' | 'cloud' | 'game'
const roomSkins: Array<{ id: SkinId; name: string; description: string; price: number; image: string }> = [
  { id: 'attic', name: '밤의 다락방', description: '기본 지급 · 잔액에 따라 제대로 낡아갑니다.', price: 0, image: '/assets/rooms/budget-states/attic-cozy.png' },
  { id: 'cloud', name: '새벽 구름방', description: '아침놀과 구름이 보이는 말랑한 방', price: 250, image: '/assets/rooms/skins/cloud-dawn.png' },
  { id: 'game', name: '주말 게임방', description: '잔액보다 세이브 파일이 중요한 방', price: 400, image: '/assets/rooms/skins/weekend-game.png' },
]
type DecorationCategory = 'appliance' | 'christmas' | 'picnic' | 'lighting' | 'retro'
type DecorationSlot = 'media-screen' | 'media-console' | 'upper-wall' | 'right-appliance' | 'right-corner' | 'floor-left' | 'floor-center' | 'tabletop' | 'wall-accent'
type Decoration = {
  id: string; name: string; description: string; category: DecorationCategory; price: number
  spriteX: number; spriteY: number; slot: DecorationSlot; left: number; top: number; width: number
}
const decorationSlots: Record<DecorationSlot, string> = {
  'media-screen': '왼쪽 TV 자리', 'media-console': 'TV 아래', 'upper-wall': '위쪽 벽',
  'right-appliance': '오른쪽 가전 자리', 'right-corner': '오른쪽 구석', 'floor-left': '왼쪽 바닥',
  'floor-center': '가운데 바닥', tabletop: '테이블 위', 'wall-accent': '오른쪽 벽',
}
type DecorationZone = 'media' | 'wall' | 'table' | 'floor' | 'right'
type TimePhase = 'auto' | 'day' | 'sunset' | 'night'
type Placement = { left: number; top: number; width: number }
const decorationZones: Array<{ value: DecorationZone; label: string; emoji: string }> = [
  { value: 'media', label: 'TV존', emoji: '📺' }, { value: 'wall', label: '벽', emoji: '🖼️' },
  { value: 'table', label: '테이블', emoji: '🪵' }, { value: 'floor', label: '바닥', emoji: '🧺' },
  { value: 'right', label: '오른쪽', emoji: '🪴' },
]
const slotZones: Record<DecorationSlot, DecorationZone> = {
  'media-screen': 'media', 'media-console': 'media', 'upper-wall': 'wall', 'wall-accent': 'wall',
  tabletop: 'table', 'floor-left': 'floor', 'floor-center': 'floor',
  'right-appliance': 'right', 'right-corner': 'right',
}
const roomPlacements: Record<SkinId, Record<DecorationSlot, Placement>> = {
  attic: {
    'media-screen': { left: 64, top: 48, width: 20 }, 'media-console': { left: 69, top: 70, width: 11 },
    'upper-wall': { left: 38, top: 8, width: 21 }, 'wall-accent': { left: 88, top: 17, width: 8 },
    tabletop: { left: 67, top: 55, width: 9 }, 'floor-left': { left: 4, top: 70, width: 14 },
    'floor-center': { left: 38, top: 77, width: 22 }, 'right-appliance': { left: 88, top: 65, width: 9 },
    'right-corner': { left: 86, top: 39, width: 10 },
  },
  cloud: {
    'media-screen': { left: 65, top: 49, width: 21 }, 'media-console': { left: 70, top: 71, width: 11 },
    'upper-wall': { left: 40, top: 8, width: 20 }, 'wall-accent': { left: 21, top: 18, width: 8 },
    tabletop: { left: 84, top: 30, width: 8 }, 'floor-left': { left: 4, top: 72, width: 13 },
    'floor-center': { left: 39, top: 78, width: 21 }, 'right-appliance': { left: 88, top: 65, width: 8 },
    'right-corner': { left: 87, top: 44, width: 9 },
  },
  game: {
    'media-screen': { left: 80, top: 31, width: 18 }, 'media-console': { left: 83, top: 62, width: 10 },
    'upper-wall': { left: 39, top: 7, width: 21 }, 'wall-accent': { left: 18, top: 20, width: 8 },
    tabletop: { left: 24, top: 43, width: 8 }, 'floor-left': { left: 5, top: 70, width: 13 },
    'floor-center': { left: 40, top: 78, width: 20 }, 'right-appliance': { left: 90, top: 68, width: 7 },
    'right-corner': { left: 91, top: 49, width: 7 },
  },
}
const defaultRoomSets: Record<SkinId, string[]> = {
  attic: ['mood-light', 'wall-clock'], cloud: ['string-lights', 'picnic-basket'], game: ['console', 'retro-radio'],
}
const decorations: Decoration[] = [
  { id: 'tv', name: '작은 TV', description: '주말을 순식간에 없애는 화면', category: 'appliance', price: 180, spriteX: 0, spriteY: 0, slot: 'media-screen', left: 5, top: 48, width: 23 },
  { id: 'console', name: '게임기', description: '할 게임은 많은데 시간은 없음', category: 'appliance', price: 220, spriteX: 1, spriteY: 0, slot: 'media-console', left: 10, top: 72, width: 10 },
  { id: 'air-conditioner', name: '에어컨', description: '강아지 털도 여름은 덥습니다', category: 'appliance', price: 260, spriteX: 2, spriteY: 0, slot: 'upper-wall', left: 38, top: 7, width: 20 },
  { id: 'air-purifier', name: '공기청정기', description: '털은 못 잡아도 기분은 상쾌', category: 'appliance', price: 160, spriteX: 3, spriteY: 0, slot: 'right-appliance', left: 85, top: 64, width: 8 },
  { id: 'air-fryer', name: '에어프라이어', description: '냉동 감자의 최종 목적지', category: 'appliance', price: 140, spriteX: 0, spriteY: 1, slot: 'right-appliance', left: 84, top: 63, width: 9 },
  { id: 'christmas-tree', name: '미니 트리', description: '방 한쪽만 갑자기 연말', category: 'christmas', price: 200, spriteX: 1, spriteY: 1, slot: 'right-corner', left: 83, top: 36, width: 12 },
  { id: 'string-lights', name: '전구 가랜드', description: '전기세보다 분위기가 먼저', category: 'christmas', price: 110, spriteX: 2, spriteY: 1, slot: 'upper-wall', left: 32, top: 7, width: 35 },
  { id: 'gift-boxes', name: '선물상자', description: '내용물은 아직 비밀', category: 'christmas', price: 90, spriteX: 3, spriteY: 1, slot: 'floor-left', left: 4, top: 74, width: 12 },
  { id: 'picnic-basket', name: '피크닉 바구니', description: '날씨 좋은 날 들고 나가기', category: 'picnic', price: 130, spriteX: 0, spriteY: 2, slot: 'floor-left', left: 4, top: 72, width: 13 },
  { id: 'picnic-mat', name: '체크 돗자리', description: '펴면 어디든 한강 느낌', category: 'picnic', price: 100, spriteX: 1, spriteY: 2, slot: 'floor-center', left: 38, top: 78, width: 20 },
  { id: 'camp-lantern', name: '캠핑 랜턴', description: '방 안인데 괜히 캠핑 기분', category: 'picnic', price: 120, spriteX: 2, spriteY: 2, slot: 'tabletop', left: 69, top: 58, width: 8 },
  { id: 'floor-lamp', name: '플로어 조명', description: '천장등 끄면 감성 두 배', category: 'lighting', price: 150, spriteX: 3, spriteY: 2, slot: 'right-corner', left: 86, top: 38, width: 7 },
  { id: 'mood-light', name: '버섯 무드등', description: '쓸모보다 귀여움이 중요', category: 'lighting', price: 100, spriteX: 0, spriteY: 3, slot: 'tabletop', left: 70, top: 59, width: 6 },
  { id: 'wall-clock', name: '레트로 벽시계', description: '시간은 가고 월급날은 안 옴', category: 'retro', price: 120, spriteX: 1, spriteY: 3, slot: 'wall-accent', left: 69, top: 14, width: 8 },
  { id: 'retro-radio', name: '빈티지 라디오', description: '주파수보다 분위기 수신 중', category: 'retro', price: 140, spriteX: 2, spriteY: 3, slot: 'tabletop', left: 68, top: 58, width: 9 },
  { id: 'turntable', name: '턴테이블', description: '한 면 듣고 뒤집는 부지런함', category: 'retro', price: 190, spriteX: 3, spriteY: 3, slot: 'tabletop', left: 68, top: 57, width: 10 },
]
const foodProps = [
  '/assets/props/food/delivery-clutter.png',
  '/assets/props/food/food-chicken.png',
  '/assets/props/food/food-cafe.png',
  '/assets/props/food/food-late-night.png',
] as const
const dialogue = {
  relaxed: ['왜 불렀어? 아직은 평화로운데.', '잔액 좋고, 창밖 좋고. 오늘은 합격.', '아무것도 안 사는 것도 능력이다.', '지금의 나를 기억해 둬. 곧 표정 바뀔 수도 있어.'],
  watching: ['슬슬 영수증이 말을 걸기 시작했어.', '그 결제, 미래의 네가 허락한 거 맞아?', '아직 괜찮아. 아직은.', '장바구니는 비웠는데 왜 잔액도 비었지?'],
  calculating: ['잠깐만. 계산기가 먼저 울었어.', '이번 달 며칠 남았는지는 알고 있지?', '나는 강아지고, 이건 심문이 아니야. 아마도.', '영수증끼리 단체 채팅방 만든 것 같은데.'],
  worried: ['내 방 벽이 왜 네 카드값 때문에 갈라져?', '전등 끌까, 구독을 끌까.', '오늘은 앱을 닫아도 잔액이 안 돌아와.', '지갑이 조용해서 더 무섭다.'],
  speechless: ['……나도 할 말은 있는데 전기세 아낄게.', '창밖 건물들은 불이 켜져 있네.', '다음 월급날까지 우리 친하게 지내자.', '혹시 이 상자, 책상으로 써도 돼?'],
} as const

const load = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
const won = (value: number) => value.toLocaleString('ko-KR')
const numberFromInput = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0
const formattedInput = (value: string | number) => {
  const digits = String(value).replace(/[^0-9]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}
const todayKey = new Date().toLocaleDateString('en-CA')
const stableIndex = (value: string, length: number) => [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % length
const dateKey = (date: Date) => date.toLocaleDateString('en-CA')

export default function App() {
  const [activePanel, setActivePanel] = useState<'expense' | 'budget' | 'history' | 'shop'>('expense')
  const [plan, setPlan] = useState<BudgetPlan>(() => load('pocket-plan', defaultPlan))
  const [draftPlan, setDraftPlan] = useState(plan)
  const [expenses, setExpenses] = useState<Expense[]>(() => load('pocket-expenses', []))
  const [category, setCategory] = useState<ExpenseCategory>('dining')
  const [memo, setMemo] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [dogLine, setDogLine] = useState('')
  const [points, setPoints] = useState(() => load('pocket-points', 500))
  const [inventory, setInventory] = useState<SkinId[]>(() => load('pocket-inventory', ['attic']))
  const [equippedSkin, setEquippedSkin] = useState<SkinId>(() => load('pocket-equipped-skin', 'attic'))
  const [decorationInventory, setDecorationInventory] = useState<string[]>(() => load('pocket-decoration-inventory', []))
  const [equippedDecorations, setEquippedDecorations] = useState<string[]>(() => load('pocket-equipped-decorations', []))
  const [decorationZone, setDecorationZone] = useState<DecorationZone>('media')
  const [shopTab, setShopTab] = useState<'room' | 'store' | 'inventory'>('room')
  const [timePhase, setTimePhase] = useState<TimePhase>(() => load('pocket-time-phase', 'auto'))
  const [dailyTalks, setDailyTalks] = useState(() => load(`pocket-talks-${todayKey}`, 0))
  const [budgetChecked, setBudgetChecked] = useState(() => load(`pocket-budget-check-${todayKey}`, false))
  const [claimedMissions, setClaimedMissions] = useState<string[]>(() => load(`pocket-missions-${todayKey}`, []))
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [historyView, setHistoryView] = useState<'calendar' | 'list'>('calendar')
  const [listPeriod, setListPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [listCategory, setListCategory] = useState<'all' | ExpenseCategory>('all')
  const snapshot = useMemo(() => calculateBudget(plan, expenses), [plan, expenses])
  const foodExpenses = expenses.filter(x => ['coffee', 'delivery', 'dining'].includes(x.category))
  const foodSpent = foodExpenses.reduce((sum, x) => sum + x.amount, 0)
  const foodExpenseCount = foodExpenses.length
  const shoppingCount = expenses.filter(x => x.category === 'shopping').length
  const deliveryPileCount = Math.min(4, Math.floor(foodExpenseCount / 3))
  const parcelPileCount = Math.min(4, Math.floor(shoppingCount / 3))
  const deliveryPiles = Array.from({ length: deliveryPileCount }, (_, index) => {
    const seedExpense = foodExpenses[index * 3 + 2] ?? foodExpenses[index * 3]
    return foodProps[stableIndex(seedExpense?.id ?? String(index), foodProps.length)]
  })
  const todayExpenseCount = expenses.filter(expense => new Date(expense.spentAt).toLocaleDateString('en-CA') === todayKey).length
  const foodRatio = snapshot.spendableBudget > 0 ? foodSpent / snapshot.spendableBudget : 0
  const foodLevel = foodRatio >= .2 ? 2 : foodRatio >= .1 ? 1 : 0
  const [status, line] = copy[snapshot.stage]
  const equippedRoom = roomSkins.find(skin => skin.id === equippedSkin) ?? roomSkins[0]
  const roomImage = equippedSkin === 'attic' ? roomImages[snapshot.stage] : equippedRoom.image
  const dogImage = foodLevel === 2
    ? '/assets/characters/states/dog-very-chubby.png'
    : foodLevel === 1
      ? '/assets/characters/states/dog-chubby.png'
      : snapshot.stage === 'worried' || snapshot.stage === 'speechless'
        ? '/assets/characters/states/dog-receipt.png'
        : '/assets/characters/states/dog-neutral.png'
  const placedDecorations = useMemo(() => {
    const bySlot = new Map<DecorationSlot, Decoration>()
    equippedDecorations.forEach(id => {
      const item = decorations.find(decoration => decoration.id === id)
      if (item) bySlot.set(item.slot, item)
    })
    return [...bySlot.values()]
  }, [equippedDecorations])
  const displayedDecorations = useMemo(() => {
    const equippedSlots = new Set(placedDecorations.map(item => item.slot))
    const defaults = defaultRoomSets[equippedSkin]
      .map(id => decorations.find(item => item.id === id))
      .filter((item): item is Decoration => Boolean(item) && !equippedSlots.has(item!.slot))
    return [...defaults, ...placedDecorations]
  }, [equippedSkin, placedDecorations])
  const resolvedTimePhase = useMemo(() => {
    if (timePhase !== 'auto') return timePhase
    const hour = new Date().getHours()
    if (hour >= 7 && hour < 17) return 'day'
    if (hour >= 17 && hour < 20) return 'sunset'
    return 'night'
  }, [timePhase])

  useEffect(() => localStorage.setItem('pocket-plan', JSON.stringify(plan)), [plan])
  useEffect(() => localStorage.setItem('pocket-expenses', JSON.stringify(expenses)), [expenses])
  useEffect(() => localStorage.setItem('pocket-points', JSON.stringify(points)), [points])
  useEffect(() => localStorage.setItem('pocket-inventory', JSON.stringify(inventory)), [inventory])
  useEffect(() => localStorage.setItem('pocket-equipped-skin', JSON.stringify(equippedSkin)), [equippedSkin])
  useEffect(() => localStorage.setItem('pocket-decoration-inventory', JSON.stringify(decorationInventory)), [decorationInventory])
  useEffect(() => localStorage.setItem('pocket-equipped-decorations', JSON.stringify(equippedDecorations)), [equippedDecorations])
  useEffect(() => localStorage.setItem('pocket-time-phase', JSON.stringify(timePhase)), [timePhase])
  useEffect(() => localStorage.setItem(`pocket-talks-${todayKey}`, JSON.stringify(dailyTalks)), [dailyTalks])
  useEffect(() => localStorage.setItem(`pocket-budget-check-${todayKey}`, JSON.stringify(budgetChecked)), [budgetChecked])
  useEffect(() => localStorage.setItem(`pocket-missions-${todayKey}`, JSON.stringify(claimedMissions)), [claimedMissions])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [message])

  const dailyMissions = [
    { id: 'expense-3', title: '오늘 소비 3건 기록', progress: Math.min(3, todayExpenseCount), goal: 3, reward: 50 },
    { id: 'budget-check', title: '이번 달 예산 확인', progress: budgetChecked ? 1 : 0, goal: 1, reward: 20 },
    { id: 'dog-talk-2', title: '강아지와 두 번 대화', progress: Math.min(2, dailyTalks), goal: 2, reward: 20 },
  ]
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
  const weekStart = new Date(selectedBaseDate)
  weekStart.setDate(selectedBaseDate.getDate() - selectedBaseDate.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  const periodExpenses = expenses.filter(expense => {
    const spentDate = new Date(expense.spentAt)
    if (listPeriod === 'daily') return dateKey(spentDate) === selectedDate
    if (listPeriod === 'weekly') return spentDate >= weekStart && spentDate < weekEnd
    return spentDate.getFullYear() === selectedBaseDate.getFullYear() && spentDate.getMonth() === selectedBaseDate.getMonth()
  })
  const visibleListExpenses = periodExpenses
    .filter(expense => listCategory === 'all' || expense.category === listCategory)
    .sort((a, b) => Date.parse(b.spentAt) - Date.parse(a.spentAt))
  const listTotal = visibleListExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categoryBreakdown = categories.map(info => ({
    ...info,
    total: periodExpenses.filter(expense => expense.category === info.value).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter(item => item.total > 0).sort((a, b) => b.total - a.total)

  useEffect(() => {
    const newlyCompleted = dailyMissions.filter(mission => mission.progress >= mission.goal && !claimedMissions.includes(mission.id))
    if (!newlyCompleted.length) return
    const reward = newlyCompleted.reduce((sum, mission) => sum + mission.reward, 0)
    setClaimedMissions(current => [...current, ...newlyCompleted.map(mission => mission.id)])
    setPoints(current => current + reward)
    setMessage(`일간 미션 완료! 뼈다귀 ${reward}개를 받았어요.`)
  }, [todayExpenseCount, budgetChecked, dailyTalks])

  const savePlan = (event: FormEvent) => {
    event.preventDefault()
    if (draftPlan.monthlyIncome <= 0) return setMessage('월급은 0원보다 크게 입력해주세요.')
    if (draftPlan.fixedExpenses + draftPlan.savingsGoal > draftPlan.monthlyIncome) return setMessage('고정비와 저축 목표가 월급보다 많아요.')
    setPlan(draftPlan); setBudgetChecked(true); setMessage('이번 달 예산 설정을 확인했어요.')
  }
  const saveExpense = (event: FormEvent) => {
    event.preventDefault()
    const parsed = numberFromInput(amount)
    if (!memo.trim()) return setMessage('어디에 썼는지 한 줄만 적어주세요.')
    if (!Number.isFinite(parsed) || parsed <= 0) return setMessage('사용 금액을 올바르게 입력해주세요.')
    setExpenses(list => [{ id: crypto.randomUUID(), category, amount: parsed, memo: memo.trim(), spentAt: new Date().toISOString() }, ...list])
    setMemo(''); setAmount(''); setMessage(`${memo.trim()} ${won(parsed)}원을 기록했어요.`)
  }
  const updatePlan = (key: keyof BudgetPlan, value: string) => setDraftPlan(current => ({ ...current, [key]: numberFromInput(value) }))
  const addQuickAmount = (value: number) => setAmount(current => String(numberFromInput(current) + value))
  const categoryInfo = (value: ExpenseCategory) => categories.find(x => x.value === value) ?? categories.at(-1)!
  const talkToDog = () => {
    const lines = dialogue[snapshot.stage]
    const candidates = lines.filter(candidate => candidate !== dogLine)
    setDogLine(candidates[Math.floor(Math.random() * candidates.length)] ?? lines[0])
    setBubbleVisible(true)
    setDailyTalks(current => current + 1)
  }
  const useSkin = (skin: typeof roomSkins[number]) => {
    if (inventory.includes(skin.id)) { setEquippedSkin(skin.id); setMessage(`${skin.name}으로 방을 바꿨어요.`); return }
    if (points < skin.price) { setMessage(`뼈다귀가 ${skin.price - points}개 부족해요.`); return }
    setPoints(current => current - skin.price)
    setInventory(current => [...current, skin.id])
    setEquippedSkin(skin.id)
    setMessage(`${skin.name}을 구입하고 바로 적용했어요.`)
  }
  const useDecoration = (item: Decoration) => {
    const slotItemIds = new Set(decorations.filter(candidate => candidate.slot === item.slot).map(candidate => candidate.id))
    const previous = placedDecorations.find(candidate => candidate.slot === item.slot && candidate.id !== item.id)
    if (!decorationInventory.includes(item.id)) {
      if (points < item.price) { setMessage(`뼈다귀가 ${item.price - points}개 부족해요.`); return }
      setPoints(current => current - item.price)
      setDecorationInventory(current => [...current, item.id])
      setEquippedDecorations(current => [...current.filter(id => !slotItemIds.has(id)), item.id])
      setMessage(previous ? `${item.name}을 놓고 ${previous.name}은 소지품에 넣었어요.` : `${item.name}을 구입하고 방에 놓았어요.`)
      return
    }
    if (equippedDecorations.includes(item.id)) {
      setEquippedDecorations(current => current.filter(id => id !== item.id))
      setMessage(`${item.name}을 소지품에 넣었어요.`)
    } else {
      setEquippedDecorations(current => [...current.filter(id => !slotItemIds.has(id)), item.id])
      setMessage(previous ? `${previous.name} 대신 ${item.name}을 놓았어요.` : `${item.name}을 방에 다시 놓았어요.`)
    }
  }
  const moveMonth = (offset: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1)
    setViewMonth(next)
    setSelectedDate(dateKey(next))
  }

  return <main className="app-shell">
    <header className="topbar"><div><p className="brand">POCKET MATES</p><h1>내 지갑에 얹혀사는 강아지</h1></div><button className="reset" onClick={() => setExpenses([])} disabled={!expenses.length}>이번 달 기록 비우기</button></header>

    <section className={`attic stage-${snapshot.stage} time-${resolvedTimePhase} ${equippedSkin !== 'attic' ? 'custom-skin' : ''}`} style={{ '--wear': Math.max(0, 1 - snapshot.remainingRatio) } as CSSProperties} aria-label="강아지의 방">
      <img className="room-art" src={roomImage} alt={`${equippedRoom.name}, 현재 ${status} 상태`} />
      {equippedSkin !== 'attic' && <div className="skin-wear" aria-hidden="true" />}
      <div className="prop-layer" aria-hidden="true">
        {deliveryPiles.map((source, index) => <img className="room-prop delivery-prop" src={source} alt="" key={`food-${index}-${source}`} />)}
        {Array.from({ length: parcelPileCount }, (_, index) => <img className="room-prop parcel-prop" src="/assets/props/shopping/shopping-boxes.png" alt="" key={`shopping-${index}`} />)}
      </div>
      <div className="decoration-layer" aria-hidden="true">
        {displayedDecorations.map(item => { const placement = roomPlacements[equippedSkin][item.slot]; const scale = item.width / ({ 'media-screen': 23, 'media-console': 10, 'upper-wall': 20, 'right-appliance': 9, 'right-corner': 10, 'floor-left': 13, 'floor-center': 20, tabletop: 8, 'wall-accent': 8 } as Record<DecorationSlot, number>)[item.slot]; return <span className="placed-decoration" key={`${equippedSkin}-${item.id}`} style={{ '--sprite-x': item.spriteX, '--sprite-y': item.spriteY, '--item-left': `${placement.left}%`, '--item-top': `${placement.top}%`, '--item-width': `${placement.width * scale}%` } as CSSProperties} /> })}
      </div>
      <div className="time-switch" aria-label="방 시간대"><button className={timePhase === 'auto' ? 'active' : ''} onClick={() => setTimePhase('auto')}>자동</button><button className={timePhase === 'day' ? 'active' : ''} onClick={() => setTimePhase('day')}>낮</button><button className={timePhase === 'sunset' ? 'active' : ''} onClick={() => setTimePhase('sunset')}>노을</button><button className={timePhase === 'night' ? 'active' : ''} onClick={() => setTimePhase('night')}>밤</button></div>
      <div className="dog-wrap">
        {bubbleVisible && <button className="speech" onClick={() => setBubbleVisible(false)}>{dogLine || line}<small>눌러서 닫기</small></button>}
        <button className="dog-button" onClick={talkToDog} aria-label="강아지와 대화하기"><img className="dog-art" src={dogImage} alt={`현재 강아지 상태: ${status}`} /></button>
        {!bubbleVisible && <span className="talk-hint">강아지를 눌러보세요</span>}
      </div>
    </section>

    <section className="summary-grid">
      <article><span>월급</span><strong>{won(plan.monthlyIncome)}원</strong></article>
      <article><span>고정비 제외 생활예산</span><strong>{won(snapshot.spendableBudget)}원</strong></article>
      <article className="remaining"><span>현재 남은 돈</span><strong>{won(snapshot.remainingBalance)}원</strong></article>
      <article><span>이번 달 사용</span><strong>{won(snapshot.totalSpent)}원</strong></article>
    </section>
    <div className="meter"><span style={{ width: `${Math.max(0, Math.min(100, snapshot.remainingRatio * 100))}%` }} /></div>
    <p className="status-line">{status} · 생활예산의 {Math.max(0, Math.round(snapshot.remainingRatio * 100))}%가 남았어요.</p>

    <nav className="mobile-tabs" aria-label="가계부 메뉴">
      <button className={activePanel === 'expense' ? 'active' : ''} onClick={() => setActivePanel('expense')}><span>＋</span>소비 기록</button>
      <button className={activePanel === 'budget' ? 'active' : ''} onClick={() => setActivePanel('budget')}><span>₩</span>예산 설정</button>
      <button className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}><span>≡</span>내역 {expenses.length}</button>
      <button className={activePanel === 'shop' ? 'active' : ''} onClick={() => setActivePanel('shop')}><span>⌂</span>꾸미기</button>
    </nav>

    <section className="forms-grid">
      <form className={`paper-card mobile-section ${activePanel === 'expense' ? 'is-active' : ''}`} onSubmit={saveExpense}>
        <div className="card-heading"><div><small>SPENDING</small><h2>소비 기록하기</h2></div><span>01</span></div>
        <div className="daily-missions">
          <div className="mission-heading"><b>오늘의 미션</b><span>매일 자정 초기화</span></div>
          {dailyMissions.map(mission => { const complete = claimedMissions.includes(mission.id); return <div className={`mission ${complete ? 'complete' : ''}`} key={mission.id}>
            <span className="mission-check">{complete ? '✓' : `${mission.progress}/${mission.goal}`}</span>
            <p>{mission.title}<small>🦴 {mission.reward}개</small></p>
            <div><i style={{ width: `${Math.min(100, mission.progress / mission.goal * 100)}%` }} /></div>
          </div> })}
        </div>
        <label>종류<select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>{categories.map(x => <option key={x.value} value={x.value}>{x.emoji} {x.label}</option>)}</select></label>
        <label>어디에 썼나요?<input value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 친구랑 저녁, 새 게임" maxLength={40} /></label>
        <label>얼마를 썼나요?<div className="won-input"><input type="text" inputMode="numeric" value={formattedInput(amount)} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0"/><span>원</span></div></label>
        <div className="quick-amounts" aria-label="금액 빠르게 더하기">
          <button type="button" onClick={() => addQuickAmount(100_000)}>+100,000</button>
          <button type="button" onClick={() => addQuickAmount(10_000)}>+10,000</button>
          <button type="button" onClick={() => addQuickAmount(1_000)}>+1,000</button>
          <button type="button" className="clear-amount" onClick={() => setAmount('')}>초기화</button>
        </div>
        <button className="save-button" type="submit">기록하고 강아지에게 알리기</button>
      </form>

      <form className={`paper-card mobile-section ${activePanel === 'budget' ? 'is-active' : ''}`} onSubmit={savePlan}>
        <div className="card-heading"><div><small>MONTHLY PLAN</small><h2>이번 달 기준 정하기</h2></div><span>02</span></div>
        <label>월급<div className="won-input"><input type="text" inputMode="numeric" value={formattedInput(draftPlan.monthlyIncome)} onChange={e => updatePlan('monthlyIncome', e.target.value)}/><span>원</span></div></label>
        <label>매달 나가는 고정비<div className="won-input"><input type="text" inputMode="numeric" value={formattedInput(draftPlan.fixedExpenses)} onChange={e => updatePlan('fixedExpenses', e.target.value)}/><span>원</span></div></label>
        <label>저축 목표<div className="won-input"><input type="text" inputMode="numeric" value={formattedInput(draftPlan.savingsGoal)} onChange={e => updatePlan('savingsGoal', e.target.value)}/><span>원</span></div></label>
        <button className="save-button secondary" type="submit">이번 달 예산 저장하기</button>
      </form>
    </section>
    {message && <p className="toast" role="status">{message}</p>}

    <section className={`history mobile-section ${activePanel === 'history' ? 'is-active' : ''}`}>
      <div className="history-title"><div><small>HISTORY</small><h2>소비 기록</h2></div><b>{expenses.length}건</b></div>
      <div className="view-switch"><button className={historyView === 'calendar' ? 'active' : ''} onClick={() => setHistoryView('calendar')}>달력으로 보기</button><button className={historyView === 'list' ? 'active' : ''} onClick={() => setHistoryView('list')}>리스트로 보기</button></div>
      {historyView === 'calendar' ? <>
        <div className="calendar-head"><button onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button><strong>{viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월</strong><button onClick={() => moveMonth(1)} aria-label="다음 달">›</button></div>
        <div className="weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
        <div className="calendar-grid">{calendarCells.map((day, index) => {
          if (!day) return <span className="calendar-blank" key={`blank-${index}`} />
          const key = dateKey(day); const dayExpenses = expensesByDate[key] ?? []; const isSelected = key === selectedDate; const isToday = key === todayKey
          return <button className={`${isSelected ? 'selected ' : ''}${isToday ? 'today' : ''}`} onClick={() => setSelectedDate(key)} key={key}>
            <span className="day-number">{day.getDate()}</span>
            <span className="day-icons">{dayExpenses.slice(0, 3).map(expense => <i key={expense.id}>{categoryInfo(expense.category).emoji}</i>)}{dayExpenses.length > 3 && <small>+{dayExpenses.length - 3}</small>}</span>
          </button>
        })}</div>
        <div className="selected-day-head"><div><b>{selectedBaseDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</b><small>{selectedExpenses.length}건</small></div><strong>{won(selectedTotal)}원</strong></div>
        {selectedExpenses.length === 0 ? <p className="empty">이날은 기록이 없습니다.</p> : <ul>{selectedExpenses.map(expense => { const info = categoryInfo(expense.category); return <li key={expense.id}><span className="category-icon">{info.emoji}</span><div><b>{expense.memo}</b><small>{info.label}</small></div><strong>-{won(expense.amount)}원</strong><button aria-label={`${expense.memo} 삭제`} onClick={() => setExpenses(list => list.filter(x => x.id !== expense.id))}>×</button></li> })}</ul>}
      </> : <>
        <div className="list-filters"><div>{(['daily', 'weekly', 'monthly'] as const).map(period => <button className={listPeriod === period ? 'active' : ''} onClick={() => setListPeriod(period)} key={period}>{period === 'daily' ? '일간' : period === 'weekly' ? '주간' : '월간'}</button>)}</div><select value={listCategory} onChange={event => setListCategory(event.target.value as 'all' | ExpenseCategory)}><option value="all">전체 유형</option>{categories.map(info => <option value={info.value} key={info.value}>{info.emoji} {info.label}</option>)}</select></div>
        <div className="category-breakdown">{categoryBreakdown.length ? categoryBreakdown.map(item => <button className={listCategory === item.value ? 'active' : ''} onClick={() => setListCategory(item.value)} key={item.value}><span>{item.emoji}</span><small>{item.label}</small><b>{won(item.total)}원</b></button>) : <p>이 기간에는 기록이 없습니다.</p>}</div>
        <div className="selected-day-head"><div><b>{listPeriod === 'daily' ? '선택한 날' : listPeriod === 'weekly' ? '선택한 주' : '선택한 달'}</b><small>{visibleListExpenses.length}건 · {listCategory === 'all' ? '전체 유형' : categoryInfo(listCategory).label}</small></div><strong>{won(listTotal)}원</strong></div>
        {visibleListExpenses.length === 0 ? <p className="empty">조건에 맞는 기록이 없습니다.</p> : <ul>{visibleListExpenses.map(expense => { const info = categoryInfo(expense.category); return <li key={expense.id}><span className="category-icon">{info.emoji}</span><div><b>{expense.memo}</b><small>{info.label} · {new Date(expense.spentAt).toLocaleDateString('ko-KR')}</small></div><strong>-{won(expense.amount)}원</strong><button aria-label={`${expense.memo} 삭제`} onClick={() => setExpenses(list => list.filter(x => x.id !== expense.id))}>×</button></li> })}</ul>}
      </>}
    </section>
    <section className={`shop mobile-section ${activePanel === 'shop' ? 'is-active' : ''}`}>
      <div className="history-title"><div><small>ROOM SHOP</small><h2>방과 소품 꾸미기</h2></div><b>🦴 {points}개</b></div>
      <p className="shop-guide">방과 소품은 탭에서 따로 고를 수 있어요. 소품은 정해진 자리에 놓이며, 같은 자리의 새 소품을 고르면 자동으로 교체됩니다.</p>
      <div className="shop-tab-switch"><button className={shopTab === 'room' ? 'active' : ''} onClick={() => setShopTab('room')}>방 스킨</button><button className={shopTab === 'store' ? 'active' : ''} onClick={() => setShopTab('store')}>소품 상점</button><button className={shopTab === 'inventory' ? 'active' : ''} onClick={() => setShopTab('inventory')}>내 아이템</button></div>
      {shopTab === 'room' ? <><div className="shop-section-title"><div><span>ROOM</span><h3>방 스킨</h3></div><small>한 번에 하나 사용</small></div>
      <div className="skin-grid">{roomSkins.map(skin => { const owned = inventory.includes(skin.id); const equipped = equippedSkin === skin.id; return <article key={skin.id} className={equipped ? 'equipped' : ''}>
        <img src={skin.image} alt={`${skin.name} 미리보기`} />
        <div><h3>{skin.name}</h3><p>{skin.description}</p></div>
        <button onClick={() => useSkin(skin)} disabled={equipped}>{equipped ? '사용 중' : owned ? '사용하기' : `🦴 ${skin.price}개`}</button>
      </article> })}</div></> : <><div className="shop-section-title decoration-heading"><div><span>{shopTab === 'store' ? 'STORE' : 'MY ITEMS'}</span><h3>{shopTab === 'store' ? '소품 상점' : '내 아이템'}</h3></div><small>{shopTab === 'store' ? `${decorations.length - decorationInventory.length}개 구매 가능` : `${decorationInventory.length}개 보유`}</small></div>
      <div className="decoration-filters zone-filters">{decorationZones.map(zone => <button className={decorationZone === zone.value ? 'active' : ''} onClick={() => setDecorationZone(zone.value)} key={zone.value}><span>{zone.emoji}</span>{zone.label}</button>)}</div>
      <div className="zone-guide"><b>{decorationZones.find(zone => zone.value === decorationZone)?.label}</b><span>이 구역의 자리는 서로 겹치지 않게 고정됩니다.</span></div>
      <div className="decoration-grid">{decorations.filter(item => slotZones[item.slot] === decorationZone && (shopTab === 'store' ? !decorationInventory.includes(item.id) : decorationInventory.includes(item.id))).map(item => { const owned = decorationInventory.includes(item.id); const equipped = placedDecorations.some(placed => placed.id === item.id); return <article className={equipped ? 'equipped' : ''} key={item.id}>
        <div className="decoration-preview"><span style={{ '--sprite-x': item.spriteX, '--sprite-y': item.spriteY } as CSSProperties} /></div>
        <div className="decoration-copy"><h3>{item.name}</h3><span className="slot-label">⌖ {decorationSlots[item.slot]}</span><p>{item.description}</p></div>
        <button onClick={() => useDecoration(item)}>{!owned ? `🦴 ${item.price}개` : equipped ? '방에서 치우기' : '방에 놓기'}</button>
      </article> })}</div>
      {decorations.filter(item => slotZones[item.slot] === decorationZone && (shopTab === 'store' ? !decorationInventory.includes(item.id) : decorationInventory.includes(item.id))).length === 0 && <div className="empty-inventory"><span>{shopTab === 'store' ? '✓' : '📦'}</span><b>{shopTab === 'store' ? '이 구역의 소품을 모두 보유 중이에요.' : '이 구역에 보유한 소품이 없어요.'}</b><small>{shopTab === 'store' ? '내 아이템 탭에서 배치할 수 있습니다.' : '소품 상점에서 먼저 구입해보세요.'}</small></div>}</>}
    </section>
  </main>
}
