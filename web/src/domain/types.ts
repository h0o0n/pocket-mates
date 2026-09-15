export const expenseCategories = [
  'coffee',
  'delivery',
  'dining',
  'transport',
  'shopping',
  'game',
  'subscription',
  'living',
  'other',
] as const

export type ExpenseCategory = (typeof expenseCategories)[number]

export interface BudgetPlan {
  monthlyIncome: number
  fixedExpenses: number
  savingsGoal: number
}

export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  spentAt: string
  memo?: string
}

export type CompanionStage =
  | 'relaxed'
  | 'watching'
  | 'calculating'
  | 'worried'
  | 'speechless'

export interface BudgetSnapshot {
  spendableBudget: number
  totalSpent: number
  remainingBalance: number
  remainingRatio: number
  overspentAmount: number
  stage: CompanionStage
}

export interface ExpenseReaction {
  stage: CompanionStage
  message: string
  categoryCount: number
}
