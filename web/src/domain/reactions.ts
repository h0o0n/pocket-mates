import { calculateBudget } from './budget.ts'
import type {
  BudgetPlan,
  Expense,
  ExpenseCategory,
  ExpenseReaction,
} from './types.ts'

const firstMessages: Record<ExpenseCategory, string> = {
  coffee: '커피는 필요했을 거예요. 눈찌도 일단 고개를 끄덕여요.',
  delivery: '눈찌는 배달 봉투보다 영수증을 먼저 봐요.',
  dining: '맛있는 건 인정하지만 계산은 따로예요.',
  transport: '시간을 샀고 잔액은 기록했어요.',
  shopping: '택배는 오고 잔액은 조금 줄었어요.',
  game: '눈찌가 플레이 시간을 확인하기 시작해요.',
  subscription: '이번 달에도 조용히 빠져나간 돈을 발견했어요.',
  living: '이건 눈치 줄 수 없는 지출이라 눈찌도 조용해요.',
  other: '눈찌가 어디에 쓴 돈인지 설명을 기다려요.',
}

const repeatMessages: Partial<Record<ExpenseCategory, string>> = {
  coffee: '오늘 커피와 벌써 여러 번 합의했어요.',
  delivery: '냉장고와의 협상이 또 결렬된 모양이에요.',
  dining: '눈찌가 이번 달 외식 횟수를 세기 시작해요.',
  transport: '택시가 슬슬 대중교통처럼 기록되고 있어요.',
  shopping: '장바구니가 비워질수록 눈찌 표정도 차분해요.',
  game: '새 게임보다 안 끝낸 게임이 더 많지는 않은지 확인 중이에요.',
  subscription: '구독 서비스끼리 단체 모임을 만든 것 같아요.',
}

const stageMessages = {
  calculating: '눈찌가 계산기를 꺼냈어요.',
  worried: '눈찌가 영수증을 양손으로 잡기 시작했어요.',
  speechless: '눈찌는 아무 말 없이 잔액만 바라봐요.',
} as const

export const createExpenseReaction = (
  plan: BudgetPlan,
  previousExpenses: readonly Expense[],
  newExpense: Expense,
): ExpenseReaction => {
  const expenses = [...previousExpenses, newExpense]
  const snapshot = calculateBudget(plan, expenses)
  const categoryCount = expenses.filter(
    (expense) => expense.category === newExpense.category,
  ).length

  const stageMessage =
    snapshot.stage === 'calculating' ||
    snapshot.stage === 'worried' ||
    snapshot.stage === 'speechless'
      ? stageMessages[snapshot.stage]
      : undefined

  const categoryMessage =
    categoryCount >= 3
      ? repeatMessages[newExpense.category] ?? firstMessages[newExpense.category]
      : firstMessages[newExpense.category]

  return {
    stage: snapshot.stage,
    categoryCount,
    message: stageMessage ?? categoryMessage,
  }
}
