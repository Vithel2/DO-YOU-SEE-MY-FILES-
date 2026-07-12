'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pvpCommands, pvpMatches, pvpRating } from '@/lib/db/schema'
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

/* ----------------------------------------------------------------------------
 * PvP «Сражения»: elo rating, matchmaking, rooms, command-log multiplayer.
 *
 * Sync model: both clients run their own simulation; only unit purchases go
 * through the server (pvp_commands). Clients poll ~1.2s for new commands.
 * -------------------------------------------------------------------------- */

const ELO_K = 32
const START_ELO = 1000
/** opponent silent for this long (ms) → they forfeit */
const DISCONNECT_MS = 15000
/** waiting rooms with a heartbeat older than this are dead and can be ignored */
const STALE_ROOM_MS = 20000

async function getUser(): Promise<{ id: string; name: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  return { id: session.user.id, name: session.user.name ?? 'Игрок' }
}

/** Make sure the player has a rating row; returns their current elo */
async function ensureRating(userId: string): Promise<number> {
  const rows = await db
    .insert(pvpRating)
    .values({ userId, elo: START_ELO })
    .onConflictDoNothing()
    .returning({ elo: pvpRating.elo })
  if (rows[0]) return rows[0].elo
  const existing = await db
    .select({ elo: pvpRating.elo })
    .from(pvpRating)
    .where(eq(pvpRating.userId, userId))
    .limit(1)
  return existing[0]?.elo ?? START_ELO
}

function eloDelta(myElo: number, oppElo: number, iWon: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
  return Math.round(ELO_K * ((iWon ? 1 : 0) - expected))
}

function newId(): string {
  return crypto.randomUUID()
}

function roomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/* --- profile + history ------------------------------------------------------ */

export interface PvpProfile {
  elo: number
  wins: number
  losses: number
  history: {
    opponent: string
    won: boolean
    eloDelta: number
    date: string
  }[]
}

export async function getMyPvp(): Promise<PvpProfile | null> {
  const me = await getUser()
  if (!me) return null
  const elo = await ensureRating(me.id)

  const rating = await db
    .select()
    .from(pvpRating)
    .where(eq(pvpRating.userId, me.id))
    .limit(1)

  const matches = await db
    .select()
    .from(pvpMatches)
    .where(
      and(
        eq(pvpMatches.status, 'finished'),
        or(eq(pvpMatches.hostId, me.id), eq(pvpMatches.guestId, me.id)),
      ),
    )
    .orderBy(desc(pvpMatches.finishedAt))
    .limit(20)

  const history = matches.map((m) => {
    const iAmHost = m.hostId === me.id
    return {
      opponent: (iAmHost ? m.guestName : m.hostName) ?? '???',
      won: m.winnerId === me.id,
      eloDelta: (iAmHost ? m.hostEloDelta : m.guestEloDelta) ?? 0,
      date: (m.finishedAt ?? m.createdAt).toISOString(),
    }
  })

  return {
    elo,
    wins: rating[0]?.wins ?? 0,
    losses: rating[0]?.losses ?? 0,
    history,
  }
}

/* --- matchmaking ------------------------------------------------------------ */

export interface JoinResult {
  ok: boolean
  matchId?: string
  code?: string
  /** true when we joined someone and the match is already playing */
  started?: boolean
  error?: string
}

/**
 * Find an opponent with the closest elo in the queue, or enqueue ourselves.
 * The elo window is handled client-side by repeated calls: we always join the
 * closest waiting player, which is fair because the queue is tiny.
 */
export async function findMatch(): Promise<JoinResult> {
  const me = await getUser()
  if (!me) return { ok: false, error: 'Нужен аккаунт' }
  const myElo = await ensureRating(me.id)

  // do I already have a waiting queue entry? (repeated call = keep waiting)
  const mine = await db
    .select({ id: pvpMatches.id })
    .from(pvpMatches)
    .where(
      and(
        eq(pvpMatches.hostId, me.id),
        eq(pvpMatches.status, 'waiting'),
        eq(pvpMatches.mode, 'queue'),
      ),
    )
    .limit(1)

  // closest-elo waiting opponent (fresh heartbeat, not me)
  const candidates = await db
    .select({ id: pvpMatches.id, hostElo: pvpMatches.hostElo })
    .from(pvpMatches)
    .where(
      and(
        eq(pvpMatches.status, 'waiting'),
        eq(pvpMatches.mode, 'queue'),
        ne(pvpMatches.hostId, me.id),
        isNull(pvpMatches.guestId),
        sql`${pvpMatches.hostHeartbeat} > now() - interval '20 seconds'`,
      ),
    )
    .orderBy(sql`abs(${pvpMatches.hostElo} - ${myElo})`)
    .limit(1)

  if (candidates[0]) {
    // atomic join — only one guest can win this UPDATE
    const joined = await db
      .update(pvpMatches)
      .set({
        guestId: me.id,
        guestName: me.name,
        guestElo: myElo,
        status: 'playing',
        startedAt: sql`now()`,
        guestHeartbeat: sql`now()`,
      })
      .where(and(eq(pvpMatches.id, candidates[0].id), eq(pvpMatches.status, 'waiting')))
      .returning({ id: pvpMatches.id })
    if (joined[0]) {
      // drop my own queue entry if I had one
      if (mine[0]) await db.delete(pvpMatches).where(eq(pvpMatches.id, mine[0].id))
      return { ok: true, matchId: joined[0].id, started: true }
    }
  }

  if (mine[0]) {
    // keep waiting on my existing entry (refresh heartbeat)
    await db
      .update(pvpMatches)
      .set({ hostHeartbeat: sql`now()` })
      .where(eq(pvpMatches.id, mine[0].id))
    return { ok: true, matchId: mine[0].id, started: false }
  }

  // enqueue myself
  const id = newId()
  await db.insert(pvpMatches).values({
    id,
    mode: 'queue',
    status: 'waiting',
    hostId: me.id,
    hostName: me.name,
    hostElo: myElo,
  })
  return { ok: true, matchId: id, started: false }
}

/** Leave the queue / close my waiting room */
export async function cancelSearch(matchId: string): Promise<void> {
  const me = await getUser()
  if (!me) return
  await db
    .delete(pvpMatches)
    .where(
      and(
        eq(pvpMatches.id, matchId),
        eq(pvpMatches.hostId, me.id),
        eq(pvpMatches.status, 'waiting'),
      ),
    )
}

/* --- rooms ------------------------------------------------------------------ */

export async function createRoom(isPublic: boolean): Promise<JoinResult> {
  const me = await getUser()
  if (!me) return { ok: false, error: 'Нужен аккаунт' }
  const myElo = await ensureRating(me.id)

  // close any of my older waiting entries so I can't host two rooms
  await db
    .delete(pvpMatches)
    .where(and(eq(pvpMatches.hostId, me.id), eq(pvpMatches.status, 'waiting')))

  // unique 4-digit code (a few retries on collision)
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = roomCode()
    const id = newId()
    try {
      await db.insert(pvpMatches).values({
        id,
        code,
        mode: isPublic ? 'public' : 'private',
        status: 'waiting',
        hostId: me.id,
        hostName: me.name,
        hostElo: myElo,
      })
      return { ok: true, matchId: id, code }
    } catch {
      // code collision — retry with a new code
    }
  }
  return { ok: false, error: 'Не удалось создать комнату' }
}

export async function joinRoom(code: string): Promise<JoinResult> {
  const me = await getUser()
  if (!me) return { ok: false, error: 'Нужен аккаунт' }
  const myElo = await ensureRating(me.id)

  const room = await db
    .select({ id: pvpMatches.id, hostId: pvpMatches.hostId })
    .from(pvpMatches)
    .where(and(eq(pvpMatches.code, code.trim()), eq(pvpMatches.status, 'waiting')))
    .limit(1)
  if (!room[0]) return { ok: false, error: 'Комната не найдена' }
  if (room[0].hostId === me.id) return { ok: false, error: 'Это твоя же комната' }

  const joined = await db
    .update(pvpMatches)
    .set({
      guestId: me.id,
      guestName: me.name,
      guestElo: myElo,
      status: 'playing',
      startedAt: sql`now()`,
      guestHeartbeat: sql`now()`,
    })
    .where(and(eq(pvpMatches.id, room[0].id), eq(pvpMatches.status, 'waiting')))
    .returning({ id: pvpMatches.id })
  if (!joined[0]) return { ok: false, error: 'Кто-то зашёл раньше' }
  return { ok: true, matchId: joined[0].id, started: true }
}

export interface PublicRoom {
  code: string
  hostName: string
  hostElo: number
}

export async function listPublicRooms(): Promise<PublicRoom[]> {
  const rooms = await db
    .select({
      code: pvpMatches.code,
      hostName: pvpMatches.hostName,
      hostElo: pvpMatches.hostElo,
    })
    .from(pvpMatches)
    .where(
      and(
        eq(pvpMatches.status, 'waiting'),
        eq(pvpMatches.mode, 'public'),
        sql`${pvpMatches.hostHeartbeat} > now() - interval '20 seconds'`,
      ),
    )
    .orderBy(desc(pvpMatches.createdAt))
    .limit(20)
  return rooms
    .filter((r): r is { code: string; hostName: string; hostElo: number } => r.code !== null)
    .map((r) => ({ code: r.code, hostName: r.hostName, hostElo: r.hostElo }))
}

/* --- in-match sync ----------------------------------------------------------- */

export interface PvpCommand {
  id: number
  unitId: string
}

export interface PollResult {
  ok: boolean
  status: 'waiting' | 'playing' | 'finished' | 'gone'
  /** opponent's new commands since `sinceId` */
  commands: PvpCommand[]
  opponentName: string | null
  opponentElo: number | null
  myElo: number
  /** set when finished */
  iWon?: boolean
  myEloDelta?: number
  /** true when the win came from opponent disconnect */
  byDisconnect?: boolean
  code?: string | null
}

/**
 * The single in-match sync endpoint, polled every ~1.2s:
 * refreshes my heartbeat, detects opponent disconnect (15s → forfeit),
 * returns match status + the opponent's new purchase commands.
 */
export async function pollMatch(matchId: string, sinceId: number): Promise<PollResult> {
  const empty: PollResult = {
    ok: false,
    status: 'gone',
    commands: [],
    opponentName: null,
    opponentElo: null,
    myElo: START_ELO,
  }
  const me = await getUser()
  if (!me) return empty

  const rows = await db.select().from(pvpMatches).where(eq(pvpMatches.id, matchId)).limit(1)
  const m = rows[0]
  if (!m) return empty
  const iAmHost = m.hostId === me.id
  if (!iAmHost && m.guestId !== me.id) return empty

  // refresh my heartbeat
  await db
    .update(pvpMatches)
    .set(iAmHost ? { hostHeartbeat: sql`now()` } : { guestHeartbeat: sql`now()` })
    .where(eq(pvpMatches.id, matchId))

  // disconnect detection while playing
  if (m.status === 'playing') {
    const oppBeat = iAmHost ? m.guestHeartbeat : m.hostHeartbeat
    if (oppBeat && Date.now() - oppBeat.getTime() > DISCONNECT_MS) {
      await finishMatch(matchId, me.id, true)
      const again = await db.select().from(pvpMatches).where(eq(pvpMatches.id, matchId)).limit(1)
      if (again[0]) Object.assign(m, again[0])
    }
  }

  const myElo = iAmHost ? m.hostElo : (m.guestElo ?? START_ELO)
  const base: PollResult = {
    ok: true,
    status: m.status as PollResult['status'],
    commands: [],
    opponentName: iAmHost ? m.guestName : m.hostName,
    opponentElo: iAmHost ? m.guestElo : m.hostElo,
    myElo,
    code: m.code,
  }

  if (m.status === 'finished') {
    base.iWon = m.winnerId === me.id
    base.myEloDelta = (iAmHost ? m.hostEloDelta : m.guestEloDelta) ?? 0
    return base
  }

  if (m.status === 'playing') {
    const cmds = await db
      .select({ id: pvpCommands.id, unitId: pvpCommands.unitId })
      .from(pvpCommands)
      .where(
        and(
          eq(pvpCommands.matchId, matchId),
          ne(pvpCommands.playerId, me.id),
          gt(pvpCommands.id, sinceId),
        ),
      )
      .orderBy(pvpCommands.id)
      .limit(50)
    base.commands = cmds
  }

  return base
}

/** Record my unit purchase so the opponent's client can spawn it */
export async function sendCommand(matchId: string, unitId: string): Promise<{ ok: boolean }> {
  const me = await getUser()
  if (!me) return { ok: false }
  // only participants of a live match may write commands
  const m = await db
    .select({ hostId: pvpMatches.hostId, guestId: pvpMatches.guestId, status: pvpMatches.status })
    .from(pvpMatches)
    .where(eq(pvpMatches.id, matchId))
    .limit(1)
  if (!m[0] || m[0].status !== 'playing') return { ok: false }
  if (m[0].hostId !== me.id && m[0].guestId !== me.id) return { ok: false }

  await db.insert(pvpCommands).values({ matchId, playerId: me.id, unitId })
  return { ok: true }
}

/** My base died (iWon=false) or I destroyed theirs (iWon=true) */
export async function reportResult(matchId: string, iWon: boolean): Promise<{ ok: boolean }> {
  const me = await getUser()
  if (!me) return { ok: false }
  const m = await db
    .select({ hostId: pvpMatches.hostId, guestId: pvpMatches.guestId })
    .from(pvpMatches)
    .where(eq(pvpMatches.id, matchId))
    .limit(1)
  if (!m[0] || (m[0].hostId !== me.id && m[0].guestId !== me.id)) return { ok: false }

  const winnerId = iWon ? me.id : m[0].hostId === me.id ? (m[0].guestId ?? me.id) : m[0].hostId
  await finishMatch(matchId, winnerId, false)
  return { ok: true }
}

/**
 * Atomically close the match (first reporter wins the race) and apply elo.
 * The `UPDATE ... WHERE status='playing'` guarantees elo is applied once.
 */
async function finishMatch(matchId: string, winnerId: string, byDisconnect: boolean) {
  const rows = await db.select().from(pvpMatches).where(eq(pvpMatches.id, matchId)).limit(1)
  const m = rows[0]
  if (!m || m.status !== 'playing' || !m.guestId) return

  const hostWon = winnerId === m.hostId
  const guestElo = m.guestElo ?? START_ELO
  const hostDelta = eloDelta(m.hostElo, guestElo, hostWon)
  const guestDelta = eloDelta(guestElo, m.hostElo, !hostWon)

  const closed = await db
    .update(pvpMatches)
    .set({
      status: 'finished',
      winnerId,
      hostEloDelta: hostDelta,
      guestEloDelta: guestDelta,
      finishedAt: sql`now()`,
    })
    .where(and(eq(pvpMatches.id, matchId), eq(pvpMatches.status, 'playing')))
    .returning({ id: pvpMatches.id })
  if (!closed[0]) return // someone else closed it first

  // apply elo + win/loss to both players
  await ensureRating(m.hostId)
  await ensureRating(m.guestId)
  await db
    .update(pvpRating)
    .set({
      elo: sql`GREATEST(0, ${pvpRating.elo} + ${hostDelta})`,
      wins: sql`${pvpRating.wins} + ${hostWon ? 1 : 0}`,
      losses: sql`${pvpRating.losses} + ${hostWon ? 0 : 1}`,
      updatedAt: sql`now()`,
    })
    .where(eq(pvpRating.userId, m.hostId))
  await db
    .update(pvpRating)
    .set({
      elo: sql`GREATEST(0, ${pvpRating.elo} + ${guestDelta})`,
      wins: sql`${pvpRating.wins} + ${hostWon ? 0 : 1}`,
      losses: sql`${pvpRating.losses} + ${hostWon ? 1 : 0}`,
      updatedAt: sql`now()`,
    })
    .where(eq(pvpRating.userId, m.guestId))
}
