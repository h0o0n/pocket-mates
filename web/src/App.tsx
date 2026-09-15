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
  relaxed: '/assets/room/attic-cozy.png',
  watching: '/assets/room/attic-lived-in.png',
  calculating: '/assets/room/attic-worn.png',
  worried: '/assets/room/attic-struggling.png',
  speechless: '/assets/room/attic-broke.png',
} as const
type SkinId = 'attic' | 'cloud' | 'game'
const roomSkins: Array<{ id: SkinId; name: string; description: string; price: number; image: string }> = [
  { id: 'attic', name: '밤의 다락방', description: '기본 지급 · 잔액에 따라 제대로 낡아갑니다.', price: 0, image: '/assets/room/attic-cozy.png' },
  { id: 'cloud', name: '새벽 구름방', description: '아침놀과 구름이 보이는 말랑한 방', price: 250, image: '/assets/skins/cloud-dawn.png' },
  { id: 'game', name: '주말 게임방', description: '잔액보다 세이브 파일이 중요한 방', price: 400, image: '/assets/skins/weekend-game.png' },
]
const foodProps = [
  '/assets/props/delivery-clutter.png',
  '/assets/props/food-chicken.png',
  '/assets/props/food-cafe.png',
  '/assets/props/food-late-night.png',
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
const todayKey = new Date().toLocaleDateString('en-CA')
const stableIndex = (value: string, length: number) => [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % length

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
    ? '/assets/characters/dog-very-chubby.png'
    : foodLevel === 1
      ? '/assets/characters/dog-chubby.png'
      : snapshot.stage === 'worried' || snapshot.stage === 'speechless'
        ? '/assets/characters/dog-receipt.png'
        : '/assets/characters/dog-neutral.png'

  useEffect(() => localStorage.setItem('pocket-plan', JSON.stringify(plan)), [plan])
  useEffect(() => localStorage.setItem('pocket-expenses', JSON.stringify(expenses)), [expenses])
  useEffect(() => localStorage.setItem('pocket-points', JSON.stringify(points)), [points])
  useEffect(() => localStorage.setItem('pocket-inventory', JSON.stringify(inventory)), [inventory])
  useEffect(() => localStorage.setItem('pocket-equipped-skin', JSON.stringify(equippedSkin)), [equippedSkin])
  useEffect(() => localStorage.setItem(`pocket-talks-${todayKey}`, JSON.stringify(dailyTalks)), [dailyTalks])
  useEffect(() => localStorage.setItem(`pocket-budget-check-${todayKey}`, JSON.stringify(budgetChecked)), [budgetChecked])
  useEffect(() => localStorage.setItem(`pocket-missions-${todayKey}`, JSON.stringify(claimedMissions)), [claimedMissions])

  const dailyMissions = [
    { id: 'expense-3', title: '오늘 소비 3건 기록', progress: Math.min(3, todayExpenseCount), goal: 3, reward: 50 },
    { id: 'budget-check', title: '이번 달 예산 확인', progress: budgetChecked ? 1 : 0, goal: 1, reward: 20 },
    { id: 'dog-talk-2', title: '강아지와 두 번 대화', progress: Math.min(2, dailyTalks), goal: 2, reward: 20 },
  ]

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
    const parsed = Number(amount)
    if (!memo.trim()) return setMessage('어디에 썼는지 한 줄만 적어주세요.')
    if (!Number.isFinite(parsed) || parsed <= 0) return setMessage('사용 금액을 올바르게 입력해주세요.')
    setExpenses(list => [{ id: crypto.randomUUID(), category, amount: parsed, memo: memo.trim(), spentAt: new Date().toISOString() }, ...list])
    setMemo(''); setAmount(''); setMessage(`${memo.trim()} ${won(parsed)}원을 기록했어요.`)
  }
  const updatePlan = (key: keyof BudgetPlan, value: string) => setDraftPlan(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }))
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

  return <main className="app-shell">
    <header className="topbar"><div><p className="brand">POCKET MATES</p><h1>내 지갑에 얹혀사는 강아지</h1></div><button className="reset" onClick={() => setExpenses([])} disabled={!expenses.length}>이번 달 기록 비우기</button></header>

    <section className={`attic stage-${snapshot.stage} ${equippedSkin !== 'attic' ? 'custom-skin' : ''}`} style={{ '--wear': Math.max(0, 1 - snapshot.remainingRatio) } as CSSProperties} aria-label="강아지의 방">
      <img className="room-art" src={roomImage} alt={`${equippedRoom.name}, 현재 ${status} 상태`} />
      {equippedSkin !== 'attic' && <div className="skin-wear" aria-hidden="true" />}
      <div className="prop-layer" aria-hidden="true">
        {deliveryPiles.map((source, index) => <img className="room-prop delivery-prop" src={source} alt="" key={`food-${index}-${source}`} />)}
        {Array.from({ length: parcelPileCount }, (_, index) => <img className="room-prop parcel-prop" src="/assets/props/shopping-boxes.png" alt="" key={`shopping-${index}`} />)}
      </div>
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
        <label>얼마를 썼나요?<div className="won-input"><input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="1"/><span>원</span></div></label>
        <button className="save-button" type="submit">기록하고 강아지에게 알리기</button>
      </form>

      <form className={`paper-card mobile-section ${activePanel === 'budget' ? 'is-active' : ''}`} onSubmit={savePlan}>
        <div className="card-heading"><div><small>MONTHLY PLAN</small><h2>이번 달 기준 정하기</h2></div><span>02</span></div>
        <label>월급<div className="won-input"><input type="number" value={draftPlan.monthlyIncome} onChange={e => updatePlan('monthlyIncome', e.target.value)}/><span>원</span></div></label>
        <label>매달 나가는 고정비<div className="won-input"><input type="number" value={draftPlan.fixedExpenses} onChange={e => updatePlan('fixedExpenses', e.target.value)}/><span>원</span></div></label>
        <label>저축 목표<div className="won-input"><input type="number" value={draftPlan.savingsGoal} onChange={e => updatePlan('savingsGoal', e.target.value)}/><span>원</span></div></label>
        <button className="save-button secondary" type="submit">이번 달 예산 저장하기</button>
      </form>
    </section>
    {message && <p className="toast" role="status">{message}</p>}

    <section className={`history mobile-section ${activePanel === 'history' ? 'is-active' : ''}`}>
      <div className="history-title"><div><small>THIS MONTH</small><h2>이번 달 기록</h2></div><b>{expenses.length}건</b></div>
      {expenses.length === 0 ? <p className="empty">아직 쓴 돈이 없습니다. 강아지는 평온합니다.</p> : <ul>{expenses.slice(0, 8).map(expense => { const info = categoryInfo(expense.category); return <li key={expense.id}><span className="category-icon">{info.emoji}</span><div><b>{expense.memo}</b><small>{info.label} · {new Date(expense.spentAt).toLocaleDateString('ko-KR')}</small></div><strong>-{won(expense.amount)}원</strong><button aria-label={`${expense.memo} 삭제`} onClick={() => setExpenses(list => list.filter(x => x.id !== expense.id))}>×</button></li> })}</ul>}
    </section>
    <section className={`shop mobile-section ${activePanel === 'shop' ? 'is-active' : ''}`}>
      <div className="history-title"><div><small>ROOM SHOP</small><h2>방 꾸미기</h2></div><b>🦴 {points}개</b></div>
      <p className="shop-guide">매일 미션을 완료하면 뼈다귀를 받아요. 구입한 방은 소지품에 남아 언제든 다시 사용할 수 있습니다.</p>
      <div className="skin-grid">{roomSkins.map(skin => { const owned = inventory.includes(skin.id); const equipped = equippedSkin === skin.id; return <article key={skin.id} className={equipped ? 'equipped' : ''}>
        <img src={skin.image} alt={`${skin.name} 미리보기`} />
        <div><h3>{skin.name}</h3><p>{skin.description}</p></div>
        <button onClick={() => useSkin(skin)} disabled={equipped}>{equipped ? '사용 중' : owned ? '사용하기' : `🦴 ${skin.price}개`}</button>
      </article> })}</div>
    </section>
  </main>
}
