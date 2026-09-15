import { calculateBudget } from './budget.ts'
import type {
  BudgetPlan,
  Expense,
  ExpenseCategory,
  ExpenseReaction,
} from './types.ts'

const firstMessages: Record<ExpenseCategory, string> = {
  coffee: '커피는 필요했을 겁니다. 강아지도 일단 고개를 끄덕입니다.',
  delivery: '강아지는 배달 봉투보다 영수증을 먼저 봅니다.',
  dining: '맛있는 건 인정하지만 계산은 따로입니다.',
  transport: '시간을 샀고 잔액을 지불했습니다.',
  shopping: '택배는 오고 잔액은 떠났습니다.',
  game: '강아지가 플레이 시간을 확인하기 시작합니다.',
  subscription: '이번 달에도 조용히 빠져나간 돈을 발견했습니다.',
  living: '이건 눈치 줄 수 없는 지출이라 강아지도 조용합니다.',
  other: '강아지가 어디에 쓴 돈인지 설명을 기다립니다.',
}

const repeatMessages: Partial<Record<ExpenseCategory, string>> = {
  coffee: '오늘 커피와 벌써 여러 번 합의하셨습니다.',
  delivery: '냉장고와의 협상이 또 결렬된 모양입니다.',
  dining: '강아지가 이번 달 외식 횟수를 세기 시작합니다.',
  transport: '택시가 슬슬 대중교통처럼 기록되고 있습니다.',
  shopping: '장바구니가 비워질수록 강아지 표정도 비워집니다.',
  game: '새 게임보다 안 끝낸 게임이 더 많지는 않은지 확인 중입니다.',
  subscription: '구독 서비스끼리 단체 모임을 만든 것 같습니다.',
}

const stageMessages = {
  calculating: '강아지가 계산기를 꺼냈습니다.',
  worried: '강아지가 영수증을 양손으로 잡기 시작했습니다.',
  speechless: '강아지는 아무 말 없이 잔액만 바라봅니다.',
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
