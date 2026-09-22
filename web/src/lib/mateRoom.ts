import type { Expense } from '../domain/types.ts'
import { ensureAnonymousSession, supabase } from './supabase.ts'

export type SharedReaction = '잘 참는 중' | '눈찌가 보고 있다' | '오늘도 같이 가자'
export type SharedRoomTheme = 'christmas' | 'camping'
export type DailyMateMission = {
  type: 'each_limit' | 'combined_limit' | 'food_limit' | 'shopping_limit'
  title: string
  goal: number
}

const client = () => {
  if (!supabase) throw new Error('Supabase가 연결되지 않았어요.')
  return supabase
}

export const createMateRoom = async (displayName: string) => {
  await ensureAnonymousSession()
  const { data, error } = await client().rpc('create_mate_room', { p_display_name: displayName })
  if (error) throw error
  return data as { roomId: string; code: string }
}

export const acceptMateInvite = async (code: string, displayName: string) => {
  await ensureAnonymousSession()
  const { data, error } = await client().rpc('accept_mate_invite', {
    p_code: code,
    p_display_name: displayName,
  })
  if (error) throw error
  return data as { roomId: string; joined: boolean }
}

export const loadMateRoom = async () => {
  const session = await ensureAnonymousSession()
  const userId = session.user.id
  const membership = await client().from('mate_room_members')
    .select('room_id, display_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (membership.error) throw membership.error
  if (!membership.data) return null

  const members = await client().from('mate_room_members')
    .select('user_id, display_name')
    .eq('room_id', membership.data.room_id)
  if (members.error) throw members.error
  const mate = members.data?.find(member => member.user_id !== userId)
  const room = await client().from('mate_rooms').select('theme, success_days, room_level').eq('id', membership.data.room_id).single()
  if (room.error) throw room.error
  return {
    roomId: membership.data.room_id as string,
    mateName: mate?.display_name ?? null,
    theme: room.data.theme as SharedRoomTheme,
    successDays: Number(room.data.success_days ?? 0),
    roomLevel: Number(room.data.room_level ?? 1),
  }
}

export const syncMateDay = async (roomId: string, expenses: Expense[], shareDetails: boolean) => {
  const session = await ensureAnonymousSession()
  const userId = session.user.id
  const today = new Date().toLocaleDateString('en-CA')
  const todayExpenses = expenses.filter(item => new Date(item.spentAt).toLocaleDateString('en-CA') === today)
  const total = todayExpenses.reduce((sum, item) => sum + item.amount, 0)
  const categoryTotals = todayExpenses.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount
    return result
  }, {})
  const summary = await client().from('mate_daily_summaries').upsert({
    room_id: roomId,
    user_id: userId,
    summary_date: today,
    total_spent: total,
    category_totals: categoryTotals,
    updated_at: new Date().toISOString(),
  })
  if (summary.error) throw summary.error

  await client().from('mate_shared_expenses').delete()
    .eq('room_id', roomId).eq('user_id', userId)
    .gte('spent_at', `${today}T00:00:00`).lt('spent_at', `${today}T23:59:59.999`)
  if (shareDetails && todayExpenses.length) {
    const inserted = await client().from('mate_shared_expenses').insert(todayExpenses.map(item => ({
      room_id: roomId,
      user_id: userId,
      category: item.category,
      amount: item.amount,
      memo: item.memo?.slice(0, 40) ?? null,
      spent_at: item.spentAt,
    })))
    if (inserted.error) throw inserted.error
  }
}

export const loadMateActivity = async (roomId: string) => {
  const session = await ensureAnonymousSession()
  const userId = session.user.id
  const today = new Date().toLocaleDateString('en-CA')
  const summaries = await client().from('mate_daily_summaries')
    .select('user_id, total_spent, category_totals').eq('room_id', roomId).eq('summary_date', today)
  if (summaries.error) throw summaries.error
  const members = await client().from('mate_room_members')
    .select('user_id, display_name').eq('room_id', roomId)
  if (members.error) throw members.error
  const mate = members.data?.find(row => row.user_id !== userId)
  const room = await client().from('mate_rooms').select('theme, success_days, room_level').eq('id', roomId).single()
  if (room.error) throw room.error
  const mateSummary = summaries.data?.find(row => row.user_id !== userId)
  const shared = await client().from('mate_shared_expenses')
    .select('category, amount, memo, user_id').eq('room_id', roomId)
    .gte('spent_at', `${today}T00:00:00`).order('spent_at', { ascending: false }).limit(12)
  if (shared.error) throw shared.error
  return {
    mateName: mate?.display_name ?? null,
    theme: room.data.theme as SharedRoomTheme,
    successDays: Number(room.data.success_days ?? 0),
    roomLevel: Number(room.data.room_level ?? 1),
    mateSpentToday: Number(mateSummary?.total_spent ?? 0),
    mateCategoryTotals: (mateSummary?.category_totals ?? {}) as Record<string, number>,
    mateRecentExpenses: (shared.data ?? [])
      .filter(row => row.user_id !== userId)
      .map(row => ({ category: row.category, amount: Number(row.amount), memo: row.memo ?? '' })),
  }
}

export const loadDailyMateMission = async (roomId: string): Promise<DailyMateMission> => {
  await ensureAnonymousSession()
  const { data, error } = await client().rpc('get_mate_daily_mission', { p_room_id: roomId })
  if (error) throw error
  return data as DailyMateMission
}

export const updateMateRoomTheme = async (roomId: string, theme: SharedRoomTheme) => {
  await ensureAnonymousSession()
  const { error } = await client().rpc('set_mate_room_theme', { p_room_id: roomId, p_theme: theme })
  if (error) throw error
}

export const completeMateDailyMission = async (roomId: string) => {
  await ensureAnonymousSession()
  const { data, error } = await client().rpc('complete_mate_daily_mission', { p_room_id: roomId })
  if (error) throw error
  return data as { completed: boolean; new?: boolean; successDays?: number; roomLevel?: number; reason?: string }
}

export const leaveMateRoom = async (roomId: string) => {
  await ensureAnonymousSession()
  const { error } = await client().rpc('leave_mate_room', { p_room_id: roomId })
  if (error) throw error
}

export const sendMateReactionToRoom = async (roomId: string, reaction: SharedReaction) => {
  const session = await ensureAnonymousSession()
  const { error } = await client().from('mate_reactions').insert({
    room_id: roomId,
    sender_id: session.user.id,
    reaction,
  })
  if (error) throw error
}
