'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { playerStats, user } from '@/lib/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getUserIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export interface MatchStats {
  enemiesKilled: number
  currencyEarned: number
  victory: boolean
  superArseniys: number
  level: number
}

/**
 * Save the results of one battle. Called at the end of every match.
 * Silently does nothing when the player is not signed in (guest play is fine).
 */
export async function saveMatchStats(stats: MatchStats) {
  const userId = await getUserIdOrNull()
  if (!userId) return { saved: false }

  // basic server-side sanity clamps so nobody posts absurd values
  const kills = Math.max(0, Math.min(500, Math.floor(stats.enemiesKilled)))
  const earned = Math.max(0, Math.min(100000, Math.floor(stats.currencyEarned)))
  const supers = Math.max(0, Math.min(100, Math.floor(stats.superArseniys)))
  const level = Math.max(1, Math.min(6, Math.floor(stats.level)))

  await db
    .insert(playerStats)
    .values({
      userId,
      enemiesKilled: kills,
      currencyEarned: earned,
      victories: stats.victory ? 1 : 0,
      superArseniys: supers,
      maxLevel: level,
    })
    .onConflictDoUpdate({
      target: playerStats.userId,
      set: {
        enemiesKilled: sql`${playerStats.enemiesKilled} + ${kills}`,
        currencyEarned: sql`${playerStats.currencyEarned} + ${earned}`,
        victories: sql`${playerStats.victories} + ${stats.victory ? 1 : 0}`,
        superArseniys: sql`${playerStats.superArseniys} + ${supers}`,
        maxLevel: sql`GREATEST(${playerStats.maxLevel}, ${level})`,
        updatedAt: sql`now()`,
      },
    })

  return { saved: true }
}

export type LeaderboardCategory = 'enemiesKilled' | 'currencyEarned' | 'victories' | 'superArseniys'

export interface LeaderboardRow {
  name: string
  value: number
}

const CATEGORY_COLUMNS = {
  enemiesKilled: playerStats.enemiesKilled,
  currencyEarned: playerStats.currencyEarned,
  victories: playerStats.victories,
  superArseniys: playerStats.superArseniys,
} as const

/** Top-10 players for one leaderboard category. Public — no auth needed. */
export async function getLeaderboard(category: LeaderboardCategory): Promise<LeaderboardRow[]> {
  const column = CATEGORY_COLUMNS[category]
  if (!column) return []

  const rows = await db
    .select({ name: user.name, value: column })
    .from(playerStats)
    .innerJoin(user, eq(playerStats.userId, user.id))
    .orderBy(desc(column))
    .limit(10)

  return rows.map((r) => ({ name: r.name, value: r.value }))
}

/** The signed-in player's own stats, or null when playing as a guest. */
export async function getMyStats() {
  const userId = await getUserIdOrNull()
  if (!userId) return null
  const rows = await db.select().from(playerStats).where(eq(playerStats.userId, userId)).limit(1)
  return rows[0] ?? null
}
