'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AD_COOLDOWN_MS,
  AD_REWARD,
  BOSS_UNIT,
  CAN_DED_VALUE,
  CAN_FALL_DURATION_MS,
  CAN_GROUND_LIFETIME_MS,
  CAN_SHIZA_VALUE,
  CAN_SPAWN_INTERVAL_MS,
  ENEMY_UNITS,
  GUARD_REGEN_PER_S,
  GUARD_UNIT,
  HEAL_CAN_VALUE,
  HELP_COOLDOWN_MS,
  HELP_REWARD,
  LASER_BASE_DAMAGE,
  LASER_FIGHTER_DAMAGE,
  LASER_INTERVAL_S,
  LEVELS,
  MINI_RED_UNIT,
  NUKE_DAMAGE,
  PILL_COST,
  PLAYER_UNITS,
  RADIATION_DURATION_S,
  SUPER_UNITS,
  type LevelConfig,
  type UnitType,
} from '@/lib/game-data'
import { saveMatchStats } from '@/app/actions/stats'
import { isDevMode, markCharacterMet } from '@/lib/progress'
import {
  createLoop,
  pauseMusic,
  playDeathSound,
  playFile,
  playSound,
  resumeMusic,
} from '@/lib/sound'
import { AdModal } from './ad-modal'
import { TutorialOverlay } from './tutorial-overlay'

interface Fighter {
  uid: number
  type: UnitType
  side: 'player' | 'enemy'
  /** position 0-100 across the field */
  x: number
  hp: number
  maxHp: number
  attackCooldown: number
  fighting: boolean
}

interface FallingCan {
  uid: number
  kind: 'ded' | 'shiza' | 'heal'
  /** x in % of field width */
  x: number
  spawnedAt: number
  collected: boolean
}

/** Level 6 boss-mode state, all mutated inside the game loop */
interface BossState {
  spawned: boolean
  hp: number
  maxHp: number
  laserTimer: number
  /** active laser beam: target x (%) and what it hits */
  laser: { toX: number; kind: 'fighter' | 'base'; until: number } | null
  miniTimer: number
  /** Vadim on the nuke car */
  vadim: { status: 'pending' | 'driving' | 'done'; x: number; startAtS: number }
  /** radiation active until elapsed seconds */
  radiationUntilS: number
  nukeExplosionUntil: number
  /** Tupichkina falling from the sky */
  tupichkina: { status: 'pending' | 'falling' | 'done'; startAtS: number; landedAt: number }
  baseSquashed: boolean
  /** fullscreen virus image */
  virusUntil: number
  virusNextAtS: number
}

interface FloatText {
  uid: number
  x: number
  y: number
  text: string
}

interface GameState {
  currency: number
  playerBaseHp: number
  /** can be reduced mid-battle (Tupichkina squashes the base) */
  playerMaxHp: number
  enemyBaseHp: number
  fighters: Fighter[]
  cans: FallingCan[]
  floatTexts: FloatText[]
  result: 'playing' | 'victory' | 'defeat'
  explosion: 'none' | 'player' | 'enemy'
}

const BOSS_X = 84

const PLAYER_BASE_X = 6
const ENEMY_BASE_X = 94
const PLAYER_SPAWN_X = 12
const ENEMY_SPAWN_X = 88
const FIGHT_RANGE = 4
const BASE_RANGE = 3
const ATTACK_INTERVAL = 1

let uidCounter = 1
function nextUid() {
  uidCounter += 1
  return uidCounter
}

function pickEnemy(config: LevelConfig): UnitType {
  const total = config.enemyPool.reduce((sum, e) => sum + e.weight, 0)
  let roll = Math.random() * total
  for (const entry of config.enemyPool) {
    roll -= entry.weight
    if (roll <= 0) return ENEMY_UNITS[entry.id]
  }
  return ENEMY_UNITS[config.enemyPool[0].id]
}

interface BattlefieldProps {
  level: number
  showTutorial: boolean
  onTutorialSeen: () => void
  onResult: (result: 'victory' | 'defeat') => void
  onQuit: () => void
}

export function Battlefield({
  level,
  showTutorial,
  onTutorialSeen,
  onResult,
  onQuit,
}: BattlefieldProps) {
  const config = LEVELS.find((l) => l.level === level) ?? LEVELS[0]

  const stateRef = useRef<GameState>({
    currency: isDevMode() ? 9999 : 10,
    playerBaseHp: config.playerBaseHp,
    playerMaxHp: config.playerBaseHp,
    enemyBaseHp: config.enemyBaseHp,
    fighters: [],
    cans: [],
    floatTexts: [],
    result: 'playing',
    explosion: 'none',
  })

  // --- Level 6 boss mode ---
  const bossRef = useRef<BossState>({
    spawned: false,
    hp: BOSS_UNIT.hp,
    maxHp: BOSS_UNIT.hp,
    laserTimer: 0,
    laser: null,
    miniTimer: 0,
    vadim: { status: 'pending', x: ENEMY_BASE_X, startAtS: 20 + Math.random() * 10 },
    radiationUntilS: 0,
    nukeExplosionUntil: 0,
    tupichkina: { status: 'pending', startAtS: 15 + Math.random() * 45, landedAt: 0 },
    baseSquashed: false,
    virusUntil: 0,
    virusNextAtS: 13 + Math.random() * 10,
  })
  /** elapsed unpaused game time in seconds (event scheduling) */
  const elapsedRef = useRef(0)
  // Looping boss sounds — created once, stopped on unmount
  const loopsRef = useRef<{
    voice: ReturnType<typeof createLoop>
    car: ReturnType<typeof createLoop>
    radiation: ReturnType<typeof createLoop>
    nuke: ReturnType<typeof createLoop>
  } | null>(null)
  if (loopsRef.current === null) {
    loopsRef.current = {
      voice: createLoop('boss-voice', 1.0),
      car: createLoop('vadim-car', 0.7),
      radiation: createLoop('radiation', 0.5),
      // one-shot but stoppable: must not keep playing after quit/win/restart
      nuke: createLoop('nuke', 0.9, false),
    }
  }
  const stopAllBossSounds = useCallback(() => {
    const loops = loopsRef.current
    loops?.voice.stop()
    loops?.car.stop()
    loops?.radiation.stop()
    loops?.nuke.stop()
  }, [])
  useEffect(() => {
    // stops everything on unmount too (quit to menu / level restart)
    return stopAllBossSounds
  }, [stopAllBossSounds])
  const [, forceRender] = useState(0)
  const [paused, setPaused] = useState(showTutorial)
  const [adOpen, setAdOpen] = useState(false)
  const [adReadyAt, setAdReadyAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const resultSentRef = useRef(false)
  // per-match stats for the leaderboards
  const matchStatsRef = useRef({ enemiesKilled: 0, currencyEarned: 0, superArseniys: 0 })

  /** Quit mid-battle: still save whatever was earned so far (no-op for guests) */
  const handleQuit = useCallback(() => {
    stopAllBossSounds()
    if (!resultSentRef.current) {
      resultSentRef.current = true
      saveMatchStats({
        ...matchStatsRef.current,
        victory: false,
        level: config.level,
      }).catch(() => {})
    }
    onQuit()
  }, [onQuit, config.level, stopAllBossSounds])

  // Pill (drag & drop onto an Arseniy card)
  const [pillOwned, setPillOwned] = useState(false)
  const pillOwnedRef = useRef(false)
  pillOwnedRef.current = pillOwned
  const [pillDrag, setPillDrag] = useState<{ x: number; y: number } | null>(null)
  const pillDragRef = useRef<{ x: number; y: number } | null>(null)
  const justDroppedRef = useRef(0)
  const fieldRef = useRef<HTMLDivElement>(null)

  // Help plashka (level 2+)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpAdOpen, setHelpAdOpen] = useState(false)
  const helpNextAtRef = useRef(0)

  const canSpawnTimerRef = useRef(0)
  const enemySpawnTimerRef = useRef(config.firstSpawnDelayMs / 1000 - config.spawnIntervalMs / 1000)

  const pausedRef = useRef(paused)
  pausedRef.current = paused || adOpen || helpAdOpen

  // Music pauses while an ad plays and resumes after
  useEffect(() => {
    if (adOpen || helpAdOpen) pauseMusic()
    else resumeMusic()
  }, [adOpen, helpAdOpen])

  // Main game loop
  useEffect(() => {
    let raf: number
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const s = stateRef.current

      if (!pausedRef.current && s.result === 'playing') {
        elapsedRef.current += dt
        // --- spawn cans (faster in boss mode so the player can keep up) ---
        canSpawnTimerRef.current += dt * 1000
        if (canSpawnTimerRef.current >= CAN_SPAWN_INTERVAL_MS * (config.chaos ? 0.5 : 1)) {
          canSpawnTimerRef.current = 0
          // On level 6 heal cans also drop to patch the base up
          const roll = Math.random()
          const kind: FallingCan['kind'] = config.chaos
            ? roll < 0.22
              ? 'heal'
              : roll < 0.45
                ? 'shiza'
                : 'ded'
            : roll < 0.25
              ? 'shiza'
              : 'ded'
          s.cans.push({
            uid: nextUid(),
            kind,
            x: 15 + Math.random() * 65,
            spawnedAt: Date.now(),
            collected: false,
          })
        }
        // remove expired cans
        const nowMs = Date.now()
        s.cans = s.cans.filter(
          (c) =>
            !c.collected &&
            nowMs - c.spawnedAt < CAN_FALL_DURATION_MS + CAN_GROUND_LIFETIME_MS,
        )

        if (!config.chaos) {
          // --- spawn enemies (normal levels) ---
          enemySpawnTimerRef.current += dt
          if (enemySpawnTimerRef.current >= config.spawnIntervalMs / 1000) {
            enemySpawnTimerRef.current = 0
            const type = pickEnemy(config)
            markCharacterMet(type.id)
            s.fighters.push({
              uid: nextUid(),
              type,
              side: 'enemy',
              x: ENEMY_SPAWN_X,
              hp: type.hp,
              maxHp: type.hp,
              attackCooldown: 0,
              fighting: false,
            })
          }
        } else {
          // === LEVEL 6 BOSS MODE ===
          const boss = bossRef.current
          const elapsed = elapsedRef.current

          // Boss makes his dramatic entrance after 3 seconds
          if (!boss.spawned && elapsed >= 3) {
            boss.spawned = true
            markCharacterMet('evil-clone')
            loopsRef.current?.voice.start()
          }

          if (boss.spawned && boss.hp > 0) {
            // --- eye lasers: fighters first, base if no fighters ---
            boss.laserTimer += dt
            if (boss.laserTimer >= LASER_INTERVAL_S) {
              boss.laserTimer = 0
              const targets = s.fighters
                .filter((f) => f.side === 'player' && f.hp > 0)
                .sort((a, b) => b.x - a.x)
              if (targets.length > 0) {
                const t = targets[0]
                t.hp -= LASER_FIGHTER_DAMAGE
                boss.laser = { toX: t.x, kind: 'fighter', until: Date.now() + 450 }
              } else {
                s.playerBaseHp -= LASER_BASE_DAMAGE
                boss.laser = { toX: PLAYER_BASE_X, kind: 'base', until: Date.now() + 450 }
              }
            }
            if (boss.laser && Date.now() > boss.laser.until) boss.laser = null

            // --- little red arseniys run out of the boss ---
            boss.miniTimer += dt
            if (boss.miniTimer >= 6) {
              boss.miniTimer = 0
              if (Math.random() < 0.65) {
                const count = Math.random() < 0.35 ? 2 : 1
                for (let i = 0; i < count; i++) {
                  markCharacterMet('mini-red')
                  s.fighters.push({
                    uid: nextUid(),
                    type: MINI_RED_UNIT,
                    side: 'enemy',
                    x: BOSS_X - 2 - i * 2,
                    hp: MINI_RED_UNIT.hp,
                    maxHp: MINI_RED_UNIT.hp,
                    attackCooldown: 0,
                    fighting: false,
                  })
                }
              }
            }

            // --- virus screen interference ---
            if (elapsed >= boss.virusNextAtS) {
              boss.virusUntil = Date.now() + 2500
              boss.virusNextAtS = elapsed + 14 + Math.random() * 12
            }
          }

          // --- Vadim on the nuke car (once per level) ---
          const vadim = boss.vadim
          if (vadim.status === 'pending' && elapsed >= vadim.startAtS) {
            vadim.status = 'driving'
            markCharacterMet('evil-vadim')
            loopsRef.current?.car.start()
          }
          if (vadim.status === 'driving') {
            vadim.x -= 11 * dt
            if (vadim.x <= PLAYER_BASE_X + 3) {
              vadim.status = 'done'
              loopsRef.current?.car.stop()
              loopsRef.current?.nuke.start()
              s.playerBaseHp -= NUKE_DAMAGE
              boss.nukeExplosionUntil = Date.now() + 2200
              boss.radiationUntilS = elapsed + RADIATION_DURATION_S
              // radiation hiss right after the nuke blast
              setTimeout(() => loopsRef.current?.radiation.start(), 2300)
            }
          }

          // --- radiation aftermath ---
          const radiationActive = elapsed < boss.radiationUntilS
          if (radiationActive) {
            s.playerBaseHp -= 2.5 * dt
            for (const f of s.fighters) {
              if (f.side === 'player') f.hp -= 1.5 * dt
              else f.hp = Math.min(f.maxHp, f.hp + 2 * dt) // radiation heals enemies
            }
          } else if (boss.radiationUntilS > 0 && elapsed >= boss.radiationUntilS) {
            loopsRef.current?.radiation.stop()
            boss.radiationUntilS = 0
          }

          // --- Tupichkina falls from the sky (once per level) ---
          const tup = boss.tupichkina
          if (tup.status === 'pending' && elapsed >= tup.startAtS) {
            tup.status = 'falling'
            tup.landedAt = Date.now() + 1500
          }
          if (tup.status === 'falling' && Date.now() >= tup.landedAt) {
            tup.status = 'done'
            markCharacterMet('tupichkina')
            boss.baseSquashed = true
            playFile('base-explosion', 0.7)
            // base loses ~30% of max HP and a chunk of current HP
            s.playerMaxHp = Math.round(s.playerMaxHp * 0.7)
            s.playerBaseHp = Math.min(s.playerBaseHp, s.playerMaxHp) - Math.round(s.playerMaxHp * 0.12)
          }
        }

        // --- movement & combat ---
        const players = s.fighters.filter((f) => f.side === 'player')
        const enemies = s.fighters.filter((f) => f.side === 'enemy')

        const radiationBuff =
          config.chaos && elapsedRef.current < bossRef.current.radiationUntilS ? 1.25 : 1

        for (const f of s.fighters) {
          // Driggert guard slowly heals himself
          if (f.type.id === GUARD_UNIT.id && f.hp < f.maxHp) {
            f.hp = Math.min(f.maxHp, f.hp + GUARD_REGEN_PER_S * dt)
          }
          f.attackCooldown = Math.max(0, f.attackCooldown - dt)
          const foes = f.side === 'player' ? enemies : players
          const target = foes
            .filter((foe) => foe.hp > 0 && Math.abs(foe.x - f.x) <= FIGHT_RANGE)
            .sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0]

          if (target) {
            f.fighting = true
            if (f.attackCooldown <= 0) {
              target.hp -= f.type.damage * (f.side === 'enemy' ? radiationBuff : 1)
              f.attackCooldown = ATTACK_INTERVAL
            }
          } else {
            f.fighting = false
            // move toward enemy base / player base
            if (f.side === 'player') {
              if (config.chaos && bossRef.current.spawned && bossRef.current.hp > 0) {
                // In boss mode player fighters attack the BOSS, not the base
                if (f.x >= BOSS_X - FIGHT_RANGE) {
                  f.fighting = true
                  if (f.attackCooldown <= 0) {
                    bossRef.current.hp -= f.type.damage
                    f.attackCooldown = ATTACK_INTERVAL
                  }
                } else {
                  f.x += f.type.speed * dt
                }
              } else if (f.x >= ENEMY_BASE_X - BASE_RANGE) {
                if (f.attackCooldown <= 0) {
                  s.enemyBaseHp -= f.type.damage
                  f.attackCooldown = ATTACK_INTERVAL
                }
              } else {
                f.x += f.type.speed * dt
              }
            } else {
              if (f.x <= PLAYER_BASE_X + BASE_RANGE) {
                if (f.attackCooldown <= 0) {
                  s.playerBaseHp -= f.type.damage * radiationBuff
                  f.attackCooldown = ATTACK_INTERVAL
                }
              } else {
                f.x -= f.type.speed * dt
              }
            }
          }
        }

        const before = s.fighters.length
        const enemyDeaths = s.fighters.filter((f) => f.side === 'enemy' && f.hp <= 0).length
        s.fighters = s.fighters.filter((f) => f.hp > 0)
        if (s.fighters.length < before) playDeathSound()
        matchStatsRef.current.enemiesKilled += enemyDeaths

        // --- help plashka trigger (level 2+, critical situation) ---
        if (
          config.level >= 2 &&
          !helpOpen &&
          Date.now() >= helpNextAtRef.current &&
          s.playerBaseHp / config.playerBaseHp < 0.5 &&
          s.currency < 20
        ) {
          helpNextAtRef.current = Date.now() + HELP_COOLDOWN_MS
          setHelpOpen(true)
        }

        // --- win / lose ---
        const bossDefeated = config.chaos && bossRef.current.spawned && bossRef.current.hp <= 0
        if ((config.chaos ? bossDefeated : s.enemyBaseHp <= 0) && s.result === 'playing') {
          s.result = 'victory'
          s.explosion = 'enemy'
          if (config.chaos) playSound('explosion')
          else playFile('base-explosion', 0.8)
          stopAllBossSounds()
        } else if (s.playerBaseHp <= 0 && s.result === 'playing') {
          s.result = 'defeat'
          s.explosion = 'player'
          if (config.chaos) playSound('explosion')
          else playFile('base-explosion', 0.8)
          stopAllBossSounds()
        }

        if (s.result !== 'playing' && !resultSentRef.current) {
          resultSentRef.current = true
          const finalResult = s.result
          // persist stats for the leaderboards (no-op for guests)
          saveMatchStats({
            ...matchStatsRef.current,
            victory: finalResult === 'victory',
            level: config.level,
          }).catch(() => {})
          setTimeout(() => onResult(finalResult), 1600)
        }
      }

      forceRender((v) => v + 1)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [config, onResult, helpOpen])

  // clock for ad cooldown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const collectCan = useCallback((can: FallingCan) => {
    const s = stateRef.current
    if (can.collected || s.result !== 'playing') return
    can.collected = true
    let text: string
    if (can.kind === 'heal') {
      // heal can restores the player base
      const healed = Math.min(HEAL_CAN_VALUE, s.playerMaxHp - s.playerBaseHp)
      s.playerBaseHp = Math.min(s.playerMaxHp, s.playerBaseHp + HEAL_CAN_VALUE)
      text = `+${Math.max(0, Math.round(healed))} HP`
    } else {
      // Level 6 pays out much more per can — the boss fight is expensive
      const value =
        (can.kind === 'shiza' ? CAN_SHIZA_VALUE : CAN_DED_VALUE) * (config.chaos ? 3 : 1)
      s.currency += value
      matchStatsRef.current.currencyEarned += value
      text = `+${value}`
    }
    const progress = Math.min((Date.now() - can.spawnedAt) / CAN_FALL_DURATION_MS, 1)
    s.floatTexts.push({
      uid: nextUid(),
      x: can.x,
      y: 8 + progress * 62,
      text,
    })
    const textUid = s.floatTexts[s.floatTexts.length - 1].uid
    setTimeout(() => {
      stateRef.current.floatTexts = stateRef.current.floatTexts.filter(
        (ft) => ft.uid !== textUid,
      )
    }, 900)
  }, [config.chaos])

  /** Buy the Driggert guard (level 6 only): stands by our base and tanks hits */
  const buyGuard = useCallback(() => {
    const s = stateRef.current
    if (s.result !== 'playing') return
    if (s.currency < GUARD_UNIT.cost) return
    if (s.fighters.some((f) => f.type.id === GUARD_UNIT.id && f.hp > 0)) return
    s.currency -= GUARD_UNIT.cost
    markCharacterMet(GUARD_UNIT.id)
    playSound('spawn')
    s.fighters.push({
      uid: nextUid(),
      type: GUARD_UNIT,
      side: 'player',
      x: PLAYER_BASE_X + 4,
      hp: GUARD_UNIT.hp,
      maxHp: GUARD_UNIT.hp,
      attackCooldown: 0,
      fighting: false,
    })
  }, [])

  const spawnPlayerUnit = useCallback((type: UnitType, baseId?: string) => {
    const s = stateRef.current
    // Ignore the synthetic click right after a pill drop on this card
    if (Date.now() - justDroppedRef.current < 350) return
    if (s.result !== 'playing') return
    // If the pill is owned, using a card always creates the SUPER version
    const superUnit = pillOwnedRef.current ? SUPER_UNITS[baseId ?? type.id] : undefined
    const actual = superUnit ?? type
    if (s.currency < type.cost) return
    s.currency -= type.cost
    if (superUnit) {
      pillOwnedRef.current = false
      setPillOwned(false)
      markCharacterMet('super-arseniy')
      playSound('super-spawn')
      matchStatsRef.current.superArseniys += 1
    } else {
      markCharacterMet(baseId ?? type.id)
      playSound('spawn')
    }
    s.fighters.push({
      uid: nextUid(),
      type: actual,
      side: 'player',
      x: PLAYER_SPAWN_X,
      hp: actual.hp,
      maxHp: actual.hp,
      attackCooldown: 0,
      fighting: false,
    })
  }, [])

  // --- Pill drag & drop ---
  // pillDragRef is the source of truth (updated synchronously);
  // pillDrag state only mirrors it for rendering.
  const buyOrGrabPill = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current
      if (s.result !== 'playing') return
      if (!pillOwnedRef.current) {
        if (s.currency < PILL_COST) return
        s.currency -= PILL_COST
        pillOwnedRef.current = true
        setPillOwned(true)
      }
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      pillDragRef.current = { x: e.clientX, y: e.clientY }
      setPillDrag({ x: e.clientX, y: e.clientY })
    },
    [],
  )

  /** Cancel the bought pill and refund its cost */
  const cancelPill = useCallback(() => {
    if (!pillOwnedRef.current) return
    stateRef.current.currency += PILL_COST
    pillOwnedRef.current = false
    setPillOwned(false)
    pillDragRef.current = null
    setPillDrag(null)
  }, [])

  // Escape cancels the pill mid-drag too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelPill()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPill])

  // Global listeners (always attached) so the drop never misses,
  // even with overlays or very fast drags
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!pillDragRef.current) return
      pillDragRef.current = { x: e.clientX, y: e.clientY }
      setPillDrag({ x: e.clientX, y: e.clientY })
    }

    const onUp = (e: PointerEvent) => {
      const dragPos = pillDragRef.current
      if (!dragPos) return
      pillDragRef.current = null
      setPillDrag(null)
      // Some environments fire pointerup with 0,0 — fall back to the last drag position
      const px = e.clientX || dragPos.x
      const py = e.clientY || dragPos.y
      const el = document.elementFromPoint(px, py)
      const card = el?.closest('[data-unit-id]') as HTMLElement | null
      if (!card) return
      justDroppedRef.current = Date.now()
      const unitId = card.dataset.unitId as string
      const baseUnit = PLAYER_UNITS.find((u) => u.id === unitId)
      const superUnit = SUPER_UNITS[unitId]
      const s = stateRef.current
      if (!baseUnit || !superUnit || s.result !== 'playing' || s.currency < baseUnit.cost) return
    s.currency -= baseUnit.cost
    markCharacterMet('super-arseniy')
    playSound('super-spawn')
    matchStatsRef.current.superArseniys += 1
      s.fighters.push({
        uid: nextUid(),
        type: superUnit,
        side: 'player',
        x: PLAYER_SPAWN_X,
        hp: superUnit.hp,
        maxHp: superUnit.hp,
        attackCooldown: 0,
        fighting: false,
      })
      pillOwnedRef.current = false
      setPillOwned(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const s = stateRef.current
  const adReady = now >= adReadyAt
  const adCooldownLeft = Math.max(0, Math.ceil((adReadyAt - now) / 1000))

  return (
    <div
      ref={fieldRef}
      className={`relative h-full w-full select-none overflow-hidden bg-cover bg-center ${
        config.chaos ? 'chaos-shake' : ''
      }`}
      style={{ backgroundImage: "url('/assets/background.png')", touchAction: 'none' }}
    >
      {/* Level 6 chaos: pulsing red sky */}
      {config.chaos && (
        <div className="chaos-overlay pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
      )}

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-start justify-between gap-2 p-2 md:p-3">
        <button
  type="button"
  onClick={handleQuit}
  className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e] md:px-4 md:text-sm"
  >
          Выход
        </button>
        {config.chaos ? (
          /* Level 6: epic top-center HP display */
          <div className="flex w-[46%] max-w-md flex-col gap-1">
            <div className="rounded-lg border-2 border-border bg-card px-2 py-1 shadow-[2px_2px_0_#1a1a2e]">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-black text-card-foreground md:text-xs">
                <span>НАША БАЗА</span>
                <span>
                  {Math.max(0, Math.round(s.playerBaseHp))}/{s.playerMaxHp}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-background md:h-4">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${Math.max(0, (s.playerBaseHp / s.playerMaxHp) * 100)}%` }}
                />
              </div>
            </div>
            {bossRef.current.spawned && bossRef.current.hp > 0 && (
              <div className="rounded-lg border-2 border-destructive bg-card px-2 py-1 shadow-[2px_2px_0_#1a1a2e]">
                <div className="mb-0.5 flex items-center justify-between text-[10px] font-black text-destructive md:text-xs">
                  <span>ЗЛОЙ КЛОН АРСЕНИЯ</span>
                  <span>
                    {Math.max(0, Math.round(bossRef.current.hp))}/{bossRef.current.maxHp}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-background md:h-4">
                  <div
                    className="h-full bg-destructive transition-all"
                    style={{
                      width: `${Math.max(0, (bossRef.current.hp / bossRef.current.maxHp) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e] md:px-4 md:text-sm">
            {config.name}
          </div>
        )}
        <button
          type="button"
          onClick={() => adReady && setAdOpen(true)}
          disabled={!adReady}
          className="rounded-lg border-2 border-border bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-[2px_2px_0_#1a1a2e] disabled:opacity-60 md:px-4 md:text-sm"
        >
          {adReady ? `Реклама +${AD_REWARD}` : `Реклама через ${adCooldownLeft}с`}
        </button>
      </div>

      {/* Our base with the currency counter right above it */}
      <div className="absolute z-10" style={{ left: '1%', bottom: '18%', width: '13%' }}>
        <div
          className="mb-1 flex w-fit items-center gap-1.5 rounded-lg border-2 border-border bg-card px-2.5 py-1 shadow-[2px_2px_0_#1a1a2e] md:px-3"
          aria-live="polite"
        >
          <img src="/assets/can-ded.png" alt="" className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-lg font-black text-card-foreground md:text-xl">{s.currency}</span>
          {pillOwned && !pillDrag && (
            <img
              src="/assets/pill.png"
              alt="Таблетка куплена"
              className="ml-1 h-5 w-5 animate-pulse md:h-6 md:w-6"
            />
          )}
        </div>
        {!config.chaos && (
          <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full border border-border bg-card">
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${Math.max(0, (s.playerBaseHp / s.playerMaxHp) * 100)}%` }}
            />
          </div>
        )}
        <img
          src="/assets/our-base.png"
          alt="Наша будка"
          className={`w-full ${bossRef.current.baseSquashed ? 'origin-bottom scale-y-[0.72]' : ''}`}
        />
      </div>

      {/* Enemy base */}
      <div className="absolute z-10" style={{ right: '1%', bottom: '18%', width: '14%' }}>
        {!config.chaos && (
          <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full border border-border bg-card">
            <div
              className="h-full bg-destructive transition-all"
              style={{ width: `${Math.max(0, (s.enemyBaseHp / config.enemyBaseHp) * 100)}%` }}
            />
          </div>
        )}
        <img src="/assets/enemy-base.png" alt="Вражеская база" className="w-full" />
      </div>

      {/* === LEVEL 6 BOSS (huge) === */}
      {config.chaos && bossRef.current.spawned && bossRef.current.hp > 0 && (
        <div
          className="absolute z-10"
          style={{
            left: `${BOSS_X}%`,
            bottom: '18%',
            width: '27%',
            transform: 'translateX(-50%)',
          }}
        >
          <img
            src="/assets/evil-clone.png"
            alt="Злой клон Арсения"
            className="boss-pulse w-full object-contain object-bottom"
          />
        </div>
      )}

      {/* Boss eye laser */}
      {config.chaos && bossRef.current.laser && Date.now() < bossRef.current.laser.until && (
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* beam starts at the boss's eyes (he is big now, eyes ~mid-screen) */}
          <line
            x1={BOSS_X + 1}
            y1={61}
            x2={bossRef.current.laser.toX}
            y2={bossRef.current.laser.kind === 'base' ? 70 : 76}
            stroke="#ff2020"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.95}
          />
          <line
            x1={BOSS_X + 1}
            y1={61}
            x2={bossRef.current.laser.toX}
            y2={bossRef.current.laser.kind === 'base' ? 70 : 76}
            stroke="#ffb0b0"
            strokeWidth={0.5}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Vadim on the nuke car */}
      {config.chaos && bossRef.current.vadim.status === 'driving' && (
        <img
          src="/assets/evil-vadim-car.png"
          alt="Злой Вадим на ядерной тачке"
          className="absolute z-20"
          style={{
            left: `${bossRef.current.vadim.x}%`,
            bottom: '17%',
            width: '17%',
            transform: 'translateX(-50%)',
          }}
        />
      )}

      {/* Nuke explosion at the player base */}
      {config.chaos && Date.now() < bossRef.current.nukeExplosionUntil && (
        <video
          src="/assets/explosion.mp4"
          autoPlay
          muted
          playsInline
          className="absolute z-30 w-[26%] mix-blend-screen"
          style={{ left: '-2%', bottom: '14%' }}
        />
      )}

      {/* Tupichkina falling from the sky — falls all the way onto the base,
          then briefly stays where she landed (no teleporting) */}
      {config.chaos &&
        (bossRef.current.tupichkina.status === 'falling' ||
          (bossRef.current.tupichkina.status === 'done' &&
            Date.now() - bossRef.current.tupichkina.landedAt < 3000)) && (
          <img
            src="/assets/tupichkina.png"
            alt="Тупичкина падает на базу"
            className="absolute z-30 w-[10%]"
            style={{
              left: '2.5%',
              top: `${-15 + Math.min(1, Math.max(0, 1 - (bossRef.current.tupichkina.landedAt - Date.now()) / 1500)) * 73}%`,
            }}
          />
        )}

      {/* Radiation: green filter over everything */}
      {config.chaos && elapsedRef.current < bossRef.current.radiationUntilS && (
        <div
          className="radiation-overlay pointer-events-none absolute inset-0 z-40"
          aria-hidden="true"
        />
      )}

      {/* Explosion on destroyed base */}
      {s.explosion !== 'none' && (
        <video
          src="/assets/explosion.mp4"
          autoPlay
          muted
          playsInline
          className="absolute z-30 w-[22%] mix-blend-screen"
          style={
            s.explosion === 'enemy'
              ? { right: '0%', bottom: '16%' }
              : { left: '0%', bottom: '16%' }
          }
        />
      )}

      {/* Fighters — HP is hidden, like in the original */}
      {s.fighters.map((f) => (
        <div
          key={f.uid}
          className="absolute z-10 flex flex-col items-center"
          style={{
            left: `${f.x}%`,
            bottom: '18%',
            width: `${f.type.size * 0.38}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Driggert guard shows a small HP bar — he exists to soak damage */}
          {f.type.id === GUARD_UNIT.id && (
            <div className="mb-0.5 h-1.5 w-full overflow-hidden rounded-full border border-border bg-background">
              <div
                className="h-full bg-secondary"
                style={{ width: `${Math.max(0, (f.hp / f.maxHp) * 100)}%` }}
              />
            </div>
          )}
          <img
            src={f.fighting && f.type.attackImage ? f.type.attackImage : f.type.image}
            alt={f.type.name}
            className={`w-full object-contain object-bottom ${f.fighting ? 'shake' : ''} ${
              f.side === 'enemy' ? '-scale-x-100' : ''
            } ${f.type.isSuper ? 'super-glow' : ''}`}
          />
        </div>
      ))}

      {/* Falling cans */}
      {s.cans.map((can) => {
        const progress = Math.min((Date.now() - can.spawnedAt) / CAN_FALL_DURATION_MS, 1)
        const top = 8 + progress * 62
        return (
          <button
            key={can.uid}
            type="button"
            onClick={() => collectCan(can)}
            className="absolute z-20 cursor-pointer transition-transform hover:scale-110"
            style={{
              left: `${can.x}%`,
              top: `${top}%`,
              width: '5.5%',
              minWidth: 44,
              transform: 'translateX(-50%)',
            }}
            aria-label={
              can.kind === 'heal'
                ? `Собрать банку хилку, лечит базу на ${HEAL_CAN_VALUE}`
                : can.kind === 'shiza'
                  ? `Собрать банку от шизы, плюс ${CAN_SHIZA_VALUE}`
                  : `Собрать банку Дед, плюс ${CAN_DED_VALUE}`
            }
          >
            <img
              src={
                can.kind === 'heal'
                  ? '/assets/can-heal.png'
                  : can.kind === 'shiza'
                    ? '/assets/can-shiza.png'
                    : '/assets/can-ded.png'
              }
              alt=""
              className="w-full drop-shadow-md"
            />
          </button>
        )
      })}

      {/* Floating +N texts */}
      {s.floatTexts.map((ft) => (
        <span
          key={ft.uid}
          className="float-up pointer-events-none absolute z-30 text-2xl font-black text-primary"
          style={{
            left: `${ft.x}%`,
            top: `${ft.y}%`,
            textShadow: '2px 2px 0 #1a1a2e',
          }}
        >
          {ft.text}
        </span>
      ))}

      {/* Spawn buttons + pill */}
      <div className="absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 items-end gap-2 md:bottom-2 md:gap-3">
        {PLAYER_UNITS.map((unit) => {
          const affordable = s.currency >= unit.cost
          const pillTarget = pillDrag !== null
          return (
            <button
              key={unit.id}
              type="button"
              data-unit-id={unit.id}
              onClick={() => spawnPlayerUnit(unit)}
              disabled={!affordable && !pillTarget}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-4 bg-card p-1 shadow-[3px_3px_0_#1a1a2e] transition-transform md:p-1.5 ${
                pillTarget ? 'border-primary ring-2 ring-primary' : 'border-border'
              } ${
                affordable || pillTarget
                  ? 'hover:scale-105 active:translate-y-0.5'
                  : 'cursor-not-allowed opacity-50 grayscale'
              }`}
              aria-label={`Призвать: ${unit.name} за ${unit.cost}`}
            >
              <span className="text-base font-black leading-none text-card-foreground md:text-lg">
                {unit.cost}
              </span>
              <img
                src={unit.cardImage ?? unit.image}
                alt=""
                className="h-12 w-12 rounded-md object-cover sm:h-14 sm:w-14 md:h-16 md:w-16"
              />
            </button>
          )
        })}

        {/* Driggert guard card — level 6 only */}
        {config.chaos &&
          (() => {
            const guardAlive = s.fighters.some(
              (f) => f.type.id === GUARD_UNIT.id && f.hp > 0,
            )
            const guardAffordable = s.currency >= GUARD_UNIT.cost
            return (
              <button
                type="button"
                onClick={buyGuard}
                disabled={guardAlive || !guardAffordable}
                className={`flex flex-col items-center gap-0.5 rounded-xl border-4 bg-card p-1 shadow-[3px_3px_0_#1a1a2e] transition-transform md:p-1.5 ${
                  guardAlive ? 'border-secondary' : 'border-border'
                } ${
                  !guardAlive && guardAffordable
                    ? 'hover:scale-105 active:translate-y-0.5'
                    : 'cursor-not-allowed opacity-50 grayscale'
                }`}
                aria-label={
                  guardAlive
                    ? 'Дриггерт уже охраняет базу'
                    : `Нанять Дриггерта-охранника за ${GUARD_UNIT.cost}`
                }
              >
                <span className="text-base font-black leading-none text-card-foreground md:text-lg">
                  {guardAlive ? 'Есть!' : GUARD_UNIT.cost}
                </span>
                <img
                  src="/assets/driggert.png"
                  alt=""
                  className="h-12 w-12 rounded-md object-cover sm:h-14 sm:w-14 md:h-16 md:w-16"
                />
              </button>
            )
          })()}

        {/* Pill card */}
        <div className="relative flex flex-col items-center">
          {pillOwned && !pillDrag && (
            <button
              type="button"
              onClick={cancelPill}
              className="absolute -top-8 z-10 rounded-lg border-2 border-border bg-destructive px-2 py-0.5 text-xs font-black text-destructive-foreground shadow-[2px_2px_0_#1a1a2e] md:-top-9 md:text-sm"
              aria-label={`Отменить таблетку и вернуть ${PILL_COST}`}
            >
              Отмена
            </button>
          )}
          <button
            type="button"
            onPointerDown={buyOrGrabPill}
            disabled={!pillOwned && s.currency < PILL_COST}
            className={`flex flex-col items-center gap-0.5 rounded-xl border-4 bg-card p-1 shadow-[3px_3px_0_#1a1a2e] transition-transform md:p-1.5 ${
              pillOwned ? 'border-primary' : 'border-border'
            } ${
              pillOwned || s.currency >= PILL_COST
                ? 'cursor-grab hover:scale-105 active:cursor-grabbing'
                : 'cursor-not-allowed opacity-50 grayscale'
            }`}
            style={{ touchAction: 'none' }}
            aria-label={
              pillOwned
                ? 'Перетащи таблетку на Арсения для супер-версии'
                : `Купить таблетку за ${PILL_COST}`
            }
          >
            <span className="text-base font-black leading-none text-card-foreground md:text-lg">
              {pillOwned ? 'Тащи!' : PILL_COST}
            </span>
            <img
              src={pillOwned ? '/assets/pill.png' : '/assets/pill-button.png'}
              alt=""
              className={`h-12 w-12 rounded-md object-contain sm:h-14 sm:w-14 md:h-16 md:w-16 ${
                pillOwned ? 'animate-pulse' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dragged pill following the pointer — rendered in a portal to
          document.body because the scaled game stage creates a transform
          containing block that would break position:fixed coordinates */}
      {pillDrag &&
        typeof document !== 'undefined' &&
        createPortal(
          <img
            src="/assets/pill.png"
            alt=""
            className="super-glow pointer-events-none fixed z-50 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pillDrag.x, top: pillDrag.y }}
          />,
          document.body,
        )}

      {/* Drag hint */}
      {pillDrag && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e]">
          Брось таблетку на Арсения!
        </div>
      )}

      {/* Help plashka (level 2+) */}
      {helpOpen && !helpAdOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-label="Помощь"
        >
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-4 border-primary bg-card p-6 shadow-[6px_6px_0_#1a1a2e]">
            <h2 className="text-center text-3xl font-black text-card-foreground">ПОМОЩЬ!</h2>
            <p className="text-balance text-center text-base font-bold text-card-foreground">
              Дела плохи! Посмотри рекламу и получи {HELP_REWARD} валюты!
            </p>
            <div className="flex items-center gap-2">
              <img src="/assets/can-ded.png" alt="" className="h-14 w-14" />
              <span className="text-4xl font-black text-primary" style={{ textShadow: '2px 2px 0 #1a1a2e' }}>
                +{HELP_REWARD}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHelpAdOpen(true)}
                className="rounded-xl border-4 border-border bg-primary px-6 py-2.5 text-lg font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
              >
                Смотреть рекламу
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-xl border-2 border-border bg-card px-5 py-2.5 text-lg font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e]"
              >
                Нет
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          onClose={() => {
            onTutorialSeen()
            setPaused(false)
          }}
        />
      )}

      {adOpen && (
        <AdModal
          onFinished={() => {
            stateRef.current.currency += AD_REWARD
            setAdOpen(false)
            setAdReadyAt(Date.now() + AD_COOLDOWN_MS)
          }}
          onSkipEarly={() => setAdOpen(false)}
        />
      )}

      {helpAdOpen && (
        <AdModal
          onFinished={() => {
            stateRef.current.currency += HELP_REWARD
            setHelpAdOpen(false)
            setHelpOpen(false)
          }}
          onSkipEarly={() => {
            setHelpAdOpen(false)
            setHelpOpen(false)
          }}
        />
      )}

      {/* Level 6: fullscreen virus interference from the Evil Clone */}
      {config.chaos && Date.now() < bossRef.current.virusUntil && (
        <div className="absolute inset-0 z-50" role="alert" aria-label="Помехи от Злого клона">
          <img
            src="/assets/virus-image.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
