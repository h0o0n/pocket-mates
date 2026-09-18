import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateBudget,
  calculateMonthlyBudget,
  createExpenseReaction,
  filterExpensesByMonth,
  getCompanionStage,
} from './index.ts'
import type { BudgetPlan, Expense } from './types.ts'

const plan: BudgetPlan = {
  monthlyIncome: 3_000_000,
  fixedExpenses: 1_000_000,
  savingsGoal: 500_000,
}

const expense = (
  id: string,
  amount: number,
  category: Expense['category'] = 'coffee',
  spentAt = '2026-09-15T12:00:00+09:00',
): Expense => ({
  id,
  amount,
  category,
  spentAt,
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

test('월 예산은 같은 달 지출만 합산하고 이전 달 누적은 제외한다', () => {
  const list = [
    expense('aug-1', 800_000, 'shopping', '2026-08-20T12:00:00+09:00'),
    expense('sep-1', 100_000, 'coffee', '2026-09-10T12:00:00+09:00'),
    expense('sep-2', 50_000, 'dining', '2026-09-18T12:00:00+09:00'),
  ]

  const september = filterExpensesByMonth(list, '2026-09-18T00:00:00+09:00')
  assert.equal(september.length, 2)

  const result = calculateMonthlyBudget(plan, list, '2026-09-18T00:00:00+09:00')
  assert.equal(result.totalSpent, 150_000)
  assert.equal(result.remainingBalance, 1_350_000)
  assert.equal(result.stage, 'relaxed')
})

test('반응 로직도 새 지출이 속한 달만 보고 카테고리 횟수를 센다', () => {
  const previous = [
    expense('aug-delivery', 20_000, 'delivery', '2026-08-01T12:00:00+09:00'),
    expense('sep-delivery-1', 20_000, 'delivery', '2026-09-01T12:00:00+09:00'),
    expense('sep-delivery-2', 25_000, 'delivery', '2026-09-05T12:00:00+09:00'),
  ]
  const reaction = createExpenseReaction(
    plan,
    previous,
    expense('sep-delivery-3', 18_000, 'delivery', '2026-09-15T12:00:00+09:00'),
  )

  // 8월 delivery는 제외 → 9월 3회만 카운트
  assert.equal(reaction.categoryCount, 3)
  assert.match(reaction.message, /냉장고와의 협상/)
})
