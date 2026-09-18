import type { BudgetPlan, BudgetSnapshot, CompanionStage, Expense } from './types.ts'

const assertNonNegative = (label: string, value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 숫자여야 합니다.`)
  }
}

export const validateBudgetPlan = (plan: BudgetPlan) => {
  assertNonNegative('월급', plan.monthlyIncome)
  assertNonNegative('고정지출', plan.fixedExpenses)
  assertNonNegative('저축 목표', plan.savingsGoal)

  if (plan.fixedExpenses + plan.savingsGoal > plan.monthlyIncome) {
    throw new RangeError('고정지출과 저축 목표의 합이 월급보다 클 수 없습니다.')
  }
}

export const validateExpense = (expense: Expense) => {
  if (!expense.id.trim()) throw new Error('소비 기록 ID가 필요합니다.')
  assertNonNegative('소비 금액', expense.amount)
  if (expense.amount === 0) throw new RangeError('소비 금액은 0보다 커야 합니다.')

  if (Number.isNaN(Date.parse(expense.spentAt))) {
    throw new Error('소비 날짜가 올바르지 않습니다.')
  }
}

export const getCompanionStage = (remainingRatio: number): CompanionStage => {
  if (remainingRatio > 0.8) return 'relaxed'
  if (remainingRatio > 0.5) return 'watching'
  if (remainingRatio > 0.3) return 'calculating'
  if (remainingRatio > 0.1) return 'worried'
  return 'speechless'
}

/** 로컬 달력 기준 연·월이 같은지 비교 (월급 주기 = 이번 달). */
export const isSameCalendarMonth = (
  left: Date | string,
  right: Date | string,
): boolean => {
  const a = typeof left === 'string' ? new Date(left) : left
  const b = typeof right === 'string' ? new Date(right) : right
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** 기준일이 속한 달의 지출만 남긴다. 기본 기준일은 오늘. */
export const filterExpensesByMonth = (
  expenses: readonly Expense[],
  reference: Date | string = new Date(),
): Expense[] =>
  expenses.filter((expense) => isSameCalendarMonth(expense.spentAt, reference))

/**
 * 넘겨받은 지출 목록을 그대로 합산한다.
 * 월 예산이 필요하면 호출 전에 filterExpensesByMonth 하거나 calculateMonthlyBudget을 쓴다.
 */
export const calculateBudget = (
  plan: BudgetPlan,
  expenses: readonly Expense[],
): BudgetSnapshot => {
  validateBudgetPlan(plan)
  expenses.forEach(validateExpense)

  const spendableBudget = plan.monthlyIncome - plan.fixedExpenses - plan.savingsGoal
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const remainingBalance = spendableBudget - totalSpent
  const remainingRatio =
    spendableBudget === 0 ? (totalSpent === 0 ? 1 : 0) : remainingBalance / spendableBudget

  return {
    spendableBudget,
    totalSpent,
    remainingBalance,
    remainingRatio,
    overspentAmount: Math.max(0, -remainingBalance),
    stage: getCompanionStage(remainingRatio),
  }
}

/** 월 생활예산 대비, 기준 달 지출만으로 잔액·캐릭터 stage를 계산한다. */
export const calculateMonthlyBudget = (
  plan: BudgetPlan,
  expenses: readonly Expense[],
  reference: Date | string = new Date(),
): BudgetSnapshot => calculateBudget(plan, filterExpensesByMonth(expenses, reference))
