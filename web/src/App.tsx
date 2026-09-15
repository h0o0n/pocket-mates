import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

const load = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
const won = (value: number) => value.toLocaleString('ko-KR')

export default function App() {
  const [activePanel, setActivePanel] = useState<'expense' | 'budget' | 'history'>('expense')
  const [plan, setPlan] = useState<BudgetPlan>(() => load('pocket-plan', defaultPlan))
  const [draftPlan, setDraftPlan] = useState(plan)
  const [expenses, setExpenses] = useState<Expense[]>(() => load('pocket-expenses', []))
  const [category, setCategory] = useState<ExpenseCategory>('dining')
  const [memo, setMemo] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const snapshot = useMemo(() => calculateBudget(plan, expenses), [plan, expenses])
  const foodSpent = expenses.filter(x => ['coffee', 'delivery', 'dining'].includes(x.category)).reduce((sum, x) => sum + x.amount, 0)
  const foodLevel = Math.min(3, Math.floor(foodSpent / 70_000))
  const [status, line] = copy[snapshot.stage]
  const dogImage = snapshot.stage === 'worried' || snapshot.stage === 'speechless'
    ? '/assets/characters/dog-receipt.png' : foodLevel > 0 ? '/assets/characters/dog-chubby.png' : '/assets/characters/dog-neutral.png'

  useEffect(() => localStorage.setItem('pocket-plan', JSON.stringify(plan)), [plan])
  useEffect(() => localStorage.setItem('pocket-expenses', JSON.stringify(expenses)), [expenses])

  const savePlan = (event: FormEvent) => {
    event.preventDefault()
    if (draftPlan.monthlyIncome <= 0) return setMessage('월급은 0원보다 크게 입력해주세요.')
    if (draftPlan.fixedExpenses + draftPlan.savingsGoal > draftPlan.monthlyIncome) return setMessage('고정비와 저축 목표가 월급보다 많아요.')
    setPlan(draftPlan); setMessage('이번 달 예산 설정을 저장했어요.')
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

  return <main className="app-shell">
    <header className="topbar"><div><p className="brand">POCKET MATES</p><h1>내 지갑에 얹혀사는 강아지</h1></div><button className="reset" onClick={() => setExpenses([])} disabled={!expenses.length}>이번 달 기록 비우기</button></header>

    <section className={`attic stage-${snapshot.stage}`} aria-label="강아지의 다락방">
      <img className="room-art" src="/assets/room/attic-cozy.png" alt="밤 도시가 보이는 아늑한 다락방" />
      <div className="room-wear" aria-hidden="true"><i/><i/><i/></div>
      <div className="dog-wrap"><span className="speech">{line}</span><img className="dog-art" src={dogImage} alt={`현재 강아지 상태: ${status}`} />{foodLevel > 0 && <span className="food-badge">배부름 +{foodLevel}</span>}</div>
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
    </nav>

    <section className="forms-grid">
      <form className={`paper-card mobile-section ${activePanel === 'expense' ? 'is-active' : ''}`} onSubmit={saveExpense}>
        <div className="card-heading"><div><small>SPENDING</small><h2>소비 기록하기</h2></div><span>01</span></div>
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
  </main>
}
