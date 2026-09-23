import { calculateBudget, filterExpensesByMonth } from './budget.ts'
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
  groceries: '냉장고가 든든해졌고 잔액은 조금 가벼워졌어요.',
  housing: '집을 지키는 데 돈이 꽤 드네요. 눈찌도 조용히 인정해요.',
  health: '건강에는 눈치 주지 않기로 했어요. 기록만 잘 챙겨요.',
  beauty: '기분 전환 비용까지 눈찌가 꼼꼼히 적었어요.',
  education: '미래의 나에게 투자한 돈으로 기록했어요.',
  leisure: '재미도 예산 안에 있으면 눈찌가 고개를 끄덕여요.',
  travel: '추억은 남고 결제 내역도 함께 남았어요.',
  social: '마음은 넉넉하게, 금액은 정확하게 기록했어요.',
  pet: '이 지출은 귀여움으로 이미 결재가 끝난 것 같아요.',
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
  groceries: '냉장고가 이번 달에도 꽤 자주 채워지고 있어요.',
  housing: '집이 이번 달 예산을 꾸준히 먹고 있어요.',
  health: '건강 기록이 늘었어요. 몸도 잔액도 같이 챙겨요.',
  beauty: '눈찌가 이번 달 꾸밈 비용을 슬쩍 합산했어요.',
  education: '배운 만큼 통장도 똑똑해지면 좋겠어요.',
  leisure: '취미가 슬슬 본업처럼 지출되고 있어요.',
  travel: '여행의 여운보다 결제 알림이 오래가고 있어요.',
  social: '챙길 사람이 많다는 건 좋은 일이… 맞겠죠?',
  pet: '간식 봉지는 늘고 눈찌의 경쟁심도 커지고 있어요.',
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
  // 잔액 stage·카테고리 반복 멘트는 '새 지출이 속한 달' 기준으로만 본다.
  const monthExpenses = filterExpensesByMonth(
    [...previousExpenses, newExpense],
    newExpense.spentAt,
    plan.cycleStartDay,
  )
  const snapshot = calculateBudget(plan, monthExpenses)
  const categoryCount = monthExpenses.filter(
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
