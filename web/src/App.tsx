import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
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

/** v0.6 스타일: 잔액에 따라 기본 다락방 일러스트가 바뀝니다. */
const roomImages = {
  relaxed: '/assets/rooms/budget-states/attic-cozy.png',
  watching: '/assets/rooms/budget-states/attic-lived-in.png',
  calculating: '/assets/rooms/budget-states/attic-worn.png',
  worried: '/assets/rooms/budget-states/attic-struggling.png',
  speechless: '/assets/rooms/budget-states/attic-broke.png',
} as const

type SkinId = 'attic' | 'cloud' | 'game' | 'cafe' | 'library' | 'beach' | 'christmas' | 'camping'

const roomSkins: Array<{ id: SkinId; name: string; description: string; price: number; image: string }> = [
  { id: 'attic', name: '다락방', description: '기본 지급 · 잔액에 따라 제대로 낡아갑니다.', price: 0, image: '/assets/rooms/budget-states/attic-cozy.png' },
  { id: 'cloud', name: '구름방', description: '구름이 보이는 말랑한 방', price: 250, image: '/assets/rooms/skins/cloud-dawn.png' },
  { id: 'game', name: '주말 게임방', description: '잔액보다 세이브 파일이 중요한 방', price: 400, image: '/assets/rooms/skins/weekend-game.png' },
  { id: 'cafe', name: '골목 카페', description: '커피값 영수증이 쌓이기 좋은 방', price: 300, image: '/assets/rooms/skins/cafe-corner.png' },
  { id: 'library', name: '조용한 도서관', description: '소비 충동을 책으로 덮는 방', price: 350, image: '/assets/rooms/skins/quiet-library.png' },
  { id: 'beach', name: '바다 오두막', description: '파도 소리만 결제 알림보다 큰 방', price: 450, image: '/assets/rooms/skins/beach-cabin.png' },
  { id: 'christmas', name: '크리스마스 거실', description: '트리 아래에서 잔액을 지키는 방', price: 500, image: '/assets/rooms/skins/christmas-nook.png' },
  { id: 'camping', name: '숲속 캠핑', description: '텐트 안에서는 충동구매도 한숨 돌리는 방', price: 380, image: '/assets/rooms/skins/forest-camp.png' },
]

/** 식비 누적 시 랜덤하게 쌓이는 음식·배달 소품 (다양성 유지) */
const foodProps = [
  '/assets/props/food/delivery-clutter.png',
  '/assets/props/food/food-chicken.png',
  '/assets/props/food/food-cafe.png',
  '/assets/props/food/food-late-night.png',
] as const

/** 식비 기록 시 잠깐 보여 줄 랜덤 음식 연출 목록 */
const snackBites = [
  { label: '치킨', image: '/assets/props/food/food-chicken.png', line: '치킨… 네가 시켰는데 왜 내가 먹고 있지.' },
  { label: '카페 음료', image: '/assets/props/food/food-cafe.png', line: '커피는 네가 마시고, 배부른 건 나야.' },
  { label: '야식', image: '/assets/props/food/food-late-night.png', line: '야식은 밤이 시킨 거야. 나는 피해자다.' },
  { label: '배달 세트', image: '/assets/props/food/delivery-clutter.png', line: '배달 알림음이 제일 무서운 소리야.' },
  { label: '국밥', image: '/assets/props/food/food-late-night.png', line: '뜨끈한 국밥… 잔액도 같이 녹는다.' },
  { label: '디저트', image: '/assets/props/food/food-cafe.png', line: '달콤한 건 기분이고, 영수증은 현실이야.' },
] as const

type DogMotion = 'eat' | 'hop' | 'nod'

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
  const [dailyTalks, setDailyTalks] = useState(() => load(`pocket-talks-${todayKey}`, 0))
  const [budgetChecked, setBudgetChecked] = useState(() => load(`pocket-budget-check-${todayKey}`, false))
  const [claimedMissions, setClaimedMissions] = useState<string[]>(() => load(`pocket-missions-${todayKey}`, []))
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [historyView, setHistoryView] = useState<'calendar' | 'list'>('calendar')
  const [listPeriod, setListPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [listCategory, setListCategory] = useState<'all' | ExpenseCategory>('all')
  // 강아지 짧은 모션 / 식비 랜덤 음식 연출 (PNG + CSS만 사용)
  const [dogMotion, setDogMotion] = useState<DogMotion | null>(null)
  const [activeSnack, setActiveSnack] = useState<(typeof snackBites)[number] | null>(null)
  const motionTimer = useRef(0)
  const snackTimer = useRef(0)

  const snapshot = useMemo(() => calculateBudget(plan, expenses), [plan, expenses])
  const currentMonthExpenses = expenses.filter(x => {
    const d = new Date(x.spentAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const foodExpenses = currentMonthExpenses
    .filter(x => ['coffee', 'delivery', 'dining'].includes(x.category))
    .sort((a, b) => a.spentAt.localeCompare(b.spentAt))
  const foodSpent = foodExpenses.reduce((sum, x) => sum + x.amount, 0)
  const foodExpenseCount = foodExpenses.length
  const shoppingCount = currentMonthExpenses.filter(x => x.category === 'shopping').length
  const deliveryPileCount = Math.min(4, Math.floor(foodExpenseCount / 3))
  const parcelPileCount = Math.min(4, Math.floor(shoppingCount / 3))
  // 같은 소비 시드면 항상 같은 음식 소품이 나와 다양성이 유지됩니다.
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

  useEffect(() => localStorage.setItem('pocket-plan', JSON.stringify(plan)), [plan])
  useEffect(() => localStorage.setItem('pocket-expenses', JSON.stringify(expenses)), [expenses])
  useEffect(() => localStorage.setItem('pocket-points', JSON.stringify(points)), [points])
  useEffect(() => localStorage.setItem('pocket-inventory', JSON.stringify(inventory)), [inventory])
  useEffect(() => localStorage.setItem('pocket-equipped-skin', JSON.stringify(equippedSkin)), [equippedSkin])
  useEffect(() => localStorage.setItem(`pocket-talks-${todayKey}`, JSON.stringify(dailyTalks)), [dailyTalks])
  useEffect(() => localStorage.setItem(`pocket-budget-check-${todayKey}`, JSON.stringify(budgetChecked)), [budgetChecked])
  useEffect(() => localStorage.setItem(`pocket-missions-${todayKey}`, JSON.stringify(claimedMissions)), [claimedMissions])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => () => {
    window.clearTimeout(motionTimer.current)
    window.clearTimeout(snackTimer.current)
  }, [])

  /** PNG 캐릭터에 CSS 클래스만 잠깐 붙여 모션을 재생합니다. */
  const playDogMotion = (motion: DogMotion, durationMs = 1400) => {
    window.clearTimeout(motionTimer.current)
    setDogMotion(motion)
    motionTimer.current = window.setTimeout(() => setDogMotion(null), durationMs)
  }

  /** 식비 기록 시 랜덤 음식을 띄우고, 먹는 모션과 말풍선을 함께 보여 줍니다. */
  const playSnackBite = () => {
    const snack = snackBites[Math.floor(Math.random() * snackBites.length)]
    window.clearTimeout(snackTimer.current)
    setActiveSnack(snack)
    setDogLine(snack.line)
    setBubbleVisible(true)
    playDogMotion('eat', 1600)
    snackTimer.current = window.setTimeout(() => setActiveSnack(null), 2200)
    return snack
  }

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
    const memoText = memo.trim()
    if (!memoText) return setMessage('어디에 썼는지 한 줄만 적어주세요.')
    if (!Number.isFinite(parsed) || parsed <= 0) return setMessage('사용 금액을 올바르게 입력해주세요.')
    setExpenses(list => [{ id: crypto.randomUUID(), category, amount: parsed, memo: memoText, spentAt: new Date().toISOString() }, ...list])
    setMemo(''); setAmount('')

    const isFood = category === 'coffee' || category === 'delivery' || category === 'dining'
    if (isFood) {
      const snack = playSnackBite()
      setMessage(`${memoText} ${won(parsed)}원 · 강아지가 「${snack.label}」 먹는 중`)
      return
    }
    if (category === 'shopping') {
      playDogMotion('hop', 1200)
      setDogLine('택배… 설레는 척하지 마. 잔액이 먼저 도착했어.')
      setBubbleVisible(true)
      setMessage(`${memoText} ${won(parsed)}원을 기록했어요.`)
      return
    }
    playDogMotion('nod', 1000)
    setMessage(`${memoText} ${won(parsed)}원을 기록했어요.`)
  }
  const updatePlan = (key: keyof BudgetPlan, value: string) => setDraftPlan(current => ({ ...current, [key]: numberFromInput(value) }))
  const addQuickAmount = (value: number) => setAmount(current => String(numberFromInput(current) + value))
  const categoryInfo = (value: ExpenseCategory) => categories.find(x => x.value === value) ?? categories.at(-1)!
  const talkToDog = () => {
    const lines = [...dialogue[snapshot.stage],
      ...(foodLevel > 0 ? ['배달은 네가 시켰는데 배는 왜 내가 나오지.', '이 배에는 이번 달 식비가 들어 있어.'] : []),
      ...(shoppingCount >= 3 ? ['택배는 네 건데 선글라스는 내 거야.', '나 좀 멋있지. 잔액은 보지 마.'] : []),
      ...(snapshot.remainingRatio <= .5 ? ['영수증 끝이 안 보이는데. 이거 맞아?', '이거 한 장이야. 이어 붙인 거 아니야.'] : []),
    ]
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
  const moveMonth = (offset: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1)
    setViewMonth(next)
    setSelectedDate(dateKey(next))
  }

  return <main className="app-shell">
    <header className="topbar"><div><p className="brand">POCKET MATES</p><h1>내 지갑에 얹혀사는 강아지</h1></div><button className="reset" onClick={() => setExpenses([])} disabled={!expenses.length}>이번 달 기록 비우기</button></header>

    <section
      className={`attic stage-${snapshot.stage} ${equippedSkin !== 'attic' ? 'custom-skin' : ''}`}
      style={{ '--wear': Math.max(0, 1 - snapshot.remainingRatio) } as CSSProperties}
      aria-label="강아지의 방"
    >
      {/* 방만 살짝 숨쉬게 두고, 강아지는 PNG 그대로 별도 모션 클래스를 씁니다. */}
      <img className="room-art room-breathe" src={roomImage} alt={`${equippedRoom.name}, 현재 ${status} 상태`} />
      {equippedSkin !== 'attic' && <div className="skin-wear" aria-hidden="true" />}
      <div className="prop-layer" aria-hidden="true">
        {deliveryPiles.map((source, index) => (
          <img className="room-prop delivery-prop" src={source} alt="" key={`food-${index}-${source}`} />
        ))}
        {Array.from({ length: parcelPileCount }, (_, index) => (
          <img className="room-prop parcel-prop" src="/assets/props/shopping/shopping-boxes.png" alt="" key={`shopping-${index}`} />
        ))}
      </div>
      <div className={`dog-wrap ${dogMotion ? `motion-${dogMotion}` : ''}`}>
        {bubbleVisible && <button className="speech" onClick={() => setBubbleVisible(false)}>{dogLine || line}<small>눌러서 닫기</small></button>}
        {activeSnack && (
          <div className="snack-bite" aria-live="polite">
            <img src={activeSnack.image} alt="" />
            <span>{activeSnack.label}</span>
          </div>
        )}
        <button className="dog-button" onClick={talkToDog} aria-label="강아지와 대화하기">
          <img className="dog-art" src={dogImage} alt={`현재 강아지 상태: ${status}`} />
        </button>
        {!bubbleVisible && !activeSnack && <span className="talk-hint">강아지를 눌러보세요</span>}
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
          {dailyMissions.map(mission => {
            const complete = claimedMissions.includes(mission.id)
            return <div className={`mission ${complete ? 'complete' : ''}`} key={mission.id}>
              <span className="mission-check">{complete ? '✓' : `${mission.progress}/${mission.goal}`}</span>
              <p>{mission.title}<small>🦴 {mission.reward}개</small></p>
              <div><i style={{ width: `${Math.min(100, mission.progress / mission.goal * 100)}%` }} /></div>
            </div>
          })}
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
      <div className="history-title"><div><small>ROOM SHOP</small><h2>방 꾸미기</h2></div><b>🦴 {points}개</b></div>
      <p className="shop-guide">매일 미션을 완료하면 뼈다귀를 받아요. 구입한 방은 소지품에 남아 언제든 다시 사용할 수 있습니다.</p>
      <div className="skin-grid">{roomSkins.map(skin => {
        const owned = inventory.includes(skin.id)
        const equipped = equippedSkin === skin.id
        return <article key={skin.id} className={equipped ? 'equipped' : ''}>
          <img src={skin.image} alt={skin.name} />
          <div><h3>{skin.name}</h3><p>{skin.description}</p></div>
          <button onClick={() => useSkin(skin)} disabled={equipped}>{equipped ? '사용 중' : owned ? '사용하기' : `🦴 ${skin.price}개`}</button>
        </article>
      })}</div>
    </section>
  </main>
}
