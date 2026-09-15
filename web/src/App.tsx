import { calculateBudget } from './domain/index.ts'

const preview = calculateBudget(
  {
    monthlyIncome: 3_000_000,
    fixedExpenses: 1_000_000,
    savingsGoal: 500_000,
  },
  [],
)

export default function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Codex project</p>
      <h1>돈 쓰면 캐릭터가 눈치 주는 가계부</h1>
      <p className="description">
        지금은 소비 기록과 캐릭터 반응을 연결하는 핵심 로직부터 만드는 중입니다.
      </p>

      <section className="logic-card" aria-label="가계부 로직 준비 상태">
        <span>현재 준비된 로직</span>
        <strong>{preview.spendableBudget.toLocaleString('ko-KR')}원</strong>
        <p>월급에서 고정지출과 저축 목표를 제외한 사용 가능 예산</p>
      </section>
    </main>
  )
}
