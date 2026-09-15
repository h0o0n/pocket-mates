import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateBudget, createExpenseReaction, getCompanionStage } from './index.ts'
import type { BudgetPlan, Expense } from './types.ts'

const plan: BudgetPlan = {
  monthlyIncome: 3_000_000,
  fixedExpenses: 1_000_000,
  savingsGoal: 500_000,
}

const expense = (id: string, amount: number, category: Expense['category'] = 'coffee'): Expense => ({
  id,
  amount,
  category,
  spentAt: '2026-09-15T12:00:00+09:00',
})

test('고정지출과 저축 목표를 뺀 금액을 실제 사용 가능 예산으로 계산한다', () => {
  const result = calculateBudget(plan, [expense('coffee-1', 4_500)])

  assert.equal(result.spendableBudget, 1_500_000)
  assert.equal(result.totalSpent, 4_500)
  assert.equal(result.remainingBalance, 1_495_500)
  assert.equal(result.stage, 'relaxed')
})

test('잔액 비율에 따라 캐릭터 단계를 판정한다', () => {
  assert.equal(getCompanionStage(0.81), 'relaxed')
  assert.equal(getCompanionStage(0.8), 'watching')
  assert.equal(getCompanionStage(0.5), 'calculating')
  assert.equal(getCompanionStage(0.3), 'worried')
  assert.equal(getCompanionStage(0.1), 'speechless')
})

test('예산을 넘으면 음수 잔액과 초과 금액을 함께 돌려준다', () => {
  const result = calculateBudget(plan, [expense('shopping-1', 1_700_000, 'shopping')])

  assert.equal(result.remainingBalance, -200_000)
  assert.equal(result.overspentAmount, 200_000)
  assert.equal(result.stage, 'speechless')
})

test('같은 카테고리가 반복되면 반복 소비용 멘트를 고른다', () => {
  const previous = [
    expense('delivery-1', 20_000, 'delivery'),
    expense('delivery-2', 25_000, 'delivery'),
  ]
  const reaction = createExpenseReaction(
    plan,
    previous,
    expense('delivery-3', 18_000, 'delivery'),
  )

  assert.equal(reaction.categoryCount, 3)
  assert.match(reaction.message, /냉장고와의 협상/)
})

test('잘못된 금액은 저장 전에 거부한다', () => {
  assert.throws(
    () => calculateBudget(plan, [expense('bad', -1)]),
    /0 이상의 숫자/,
  )
})
