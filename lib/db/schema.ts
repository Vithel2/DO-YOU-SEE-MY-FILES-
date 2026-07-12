import { pgTable, text, timestamp, boolean, serial, integer } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------

/** Cumulative per-player stats used for the leaderboards */
export const playerStats = pgTable('player_stats', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  enemiesKilled: integer('enemiesKilled').notNull().default(0),
  currencyEarned: integer('currencyEarned').notNull().default(0),
  victories: integer('victories').notNull().default(0),
  superArseniys: integer('superArseniys').notNull().default(0),
  maxLevel: integer('maxLevel').notNull().default(1),
  /** Endless mode record: max waves survived in one run */
  wavesSurvived: integer('wavesSurvived').notNull().default(0),
  /** Secret level «Саша VS Шампунь»: exclusive wins over the shampoo */
  shampooWins: integer('shampooWins').notNull().default(0),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// --- PvP tables --------------------------------------------------------------

/** Elo rating per player for the PvP mode */
export const pvpRating = pgTable('pvp_rating', {
  userId: text('userId').primaryKey(),
  elo: integer('elo').notNull().default(1000),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

/**
 * A PvP match doubles as a room/queue entry.
 * mode: 'queue' (matchmaking) | 'public' (open room) | 'private' (code-only)
 * status: 'waiting' → 'playing' → 'finished'
 */
export const pvpMatches = pgTable('pvp_matches', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  status: text('status').notNull().default('waiting'),
  mode: text('mode').notNull().default('private'),
  hostId: text('hostId').notNull(),
  guestId: text('guestId'),
  hostName: text('hostName').notNull().default(''),
  guestName: text('guestName'),
  hostElo: integer('hostElo').notNull().default(1000),
  guestElo: integer('guestElo'),
  winnerId: text('winnerId'),
  hostEloDelta: integer('hostEloDelta'),
  guestEloDelta: integer('guestEloDelta'),
  hostHeartbeat: timestamp('hostHeartbeat').notNull().defaultNow(),
  guestHeartbeat: timestamp('guestHeartbeat'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  startedAt: timestamp('startedAt'),
  finishedAt: timestamp('finishedAt'),
})

/** Unit-purchase commands — the whole multiplayer sync happens through these */
export const pvpCommands = pgTable('pvp_commands', {
  id: serial('id').primaryKey(),
  matchId: text('matchId').notNull(),
  playerId: text('playerId').notNull(),
  unitId: text('unitId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
