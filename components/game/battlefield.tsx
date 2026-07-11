'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AD_COOLDOWN_MS,
  AD_REWARD,
  CAN_DED_VALUE,
  CAN_FALL_DURATION_MS,
  CAN_GROUND_LIFETIME_MS,
  CAN_SHIZA_VALUE,
  CAN_SPAWN_INTERVAL_MS,
  ENEMY_UNITS,
  LEVELS,
  PLAYER_UNITS,
  type LevelConfig,
  type UnitType,
} from '@/lib/game-data'
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
  kind: 'ded' | 'shiza'
  /** x in % of field width */
  x: number
  spawnedAt: number
  collected: boolean
}

interface FloatText {
  uid: number
  x: number
  y: number
  text: string
}

interface GameState {
  currency: number
  hasCollectedAnything: boolean
  playerBaseHp: number
  enemyBaseHp: number
  fighters: Fighter[]
  cans: FallingCan[]
  floatTexts: FloatText[]
  result: 'playing' | 'victory' | 'defeat'
  explosion: 'none' | 'player' | 'enemy'
}

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
    currency: 0,
    hasCollectedAnything: false,
    playerBaseHp: config.playerBaseHp,
    enemyBaseHp: config.enemyBaseHp,
    fighters: [],
    cans: [],
    floatTexts: [],
    result: 'playing',
    explosion: 'none',
  })
  const [, forceRender] = useState(0)
  const [paused, setPaused] = useState(showTutorial)
  const [adOpen, setAdOpen] = useState(false)
  const [adReadyAt, setAdReadyAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const resultSentRef = useRef(false)

  const canSpawnTimerRef = useRef(0)
  const enemySpawnTimerRef = useRef(config.firstSpawnDelayMs / 1000 - config.spawnIntervalMs / 1000)

  const pausedRef = useRef(paused)
  pausedRef.current = paused || adOpen

  // Main game loop
  useEffect(() => {
    let raf: number
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const s = stateRef.current

      if (!pausedRef.current && s.result === 'playing') {
        // --- spawn cans ---
        canSpawnTimerRef.current += dt * 1000
        if (canSpawnTimerRef.current >= CAN_SPAWN_INTERVAL_MS) {
          canSpawnTimerRef.current = 0
          s.cans.push({
            uid: nextUid(),
            kind: Math.random() < 0.25 ? 'shiza' : 'ded',
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

        // --- spawn enemies ---
        enemySpawnTimerRef.current += dt
        if (enemySpawnTimerRef.current >= config.spawnIntervalMs / 1000) {
          enemySpawnTimerRef.current = 0
          const type = pickEnemy(config)
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

        // --- movement & combat ---
        const players = s.fighters.filter((f) => f.side === 'player')
        const enemies = s.fighters.filter((f) => f.side === 'enemy')

        for (const f of s.fighters) {
          f.attackCooldown = Math.max(0, f.attackCooldown - dt)
          const foes = f.side === 'player' ? enemies : players
          const target = foes
            .filter((foe) => foe.hp > 0 && Math.abs(foe.x - f.x) <= FIGHT_RANGE)
            .sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0]

          if (target) {
            f.fighting = true
            if (f.attackCooldown <= 0) {
              target.hp -= f.type.damage
              f.attackCooldown = ATTACK_INTERVAL
            }
          } else {
            f.fighting = false
            // move toward enemy base / player base
            if (f.side === 'player') {
              if (f.x >= ENEMY_BASE_X - BASE_RANGE) {
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
                  s.playerBaseHp -= f.type.damage
                  f.attackCooldown = ATTACK_INTERVAL
                }
              } else {
                f.x -= f.type.speed * dt
              }
            }
          }
        }

        s.fighters = s.fighters.filter((f) => f.hp > 0)

        // --- win / lose ---
        if (s.enemyBaseHp <= 0 && s.result === 'playing') {
          s.result = 'victory'
          s.explosion = 'enemy'
        } else if (s.playerBaseHp <= 0 && s.result === 'playing') {
          s.result = 'defeat'
          s.explosion = 'player'
        }

        if (s.result !== 'playing' && !resultSentRef.current) {
          resultSentRef.current = true
          const finalResult = s.result
          setTimeout(() => onResult(finalResult), 1600)
        }
      }

      forceRender((v) => v + 1)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [config, onResult])

  // clock for ad cooldown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const collectCan = useCallback((can: FallingCan) => {
    const s = stateRef.current
    if (can.collected || s.result !== 'playing') return
    can.collected = true
    const value = can.kind === 'shiza' ? CAN_SHIZA_VALUE : CAN_DED_VALUE
    s.currency += value
    s.hasCollectedAnything = true
    const progress = Math.min((Date.now() - can.spawnedAt) / CAN_FALL_DURATION_MS, 1)
    s.floatTexts.push({
      uid: nextUid(),
      x: can.x,
      y: 8 + progress * 62,
      text: `+${value}`,
    })
    const textUid = s.floatTexts[s.floatTexts.length - 1].uid
    setTimeout(() => {
      stateRef.current.floatTexts = stateRef.current.floatTexts.filter(
        (ft) => ft.uid !== textUid,
      )
    }, 900)
  }, [])

  const spawnPlayerUnit = useCallback((type: UnitType) => {
    const s = stateRef.current
    if (s.currency < type.cost || s.result !== 'playing') return
    s.currency -= type.cost
    s.fighters.push({
      uid: nextUid(),
      type,
      side: 'player',
      x: PLAYER_SPAWN_X,
      hp: type.hp,
      maxHp: type.hp,
      attackCooldown: 0,
      fighting: false,
    })
  }, [])

  const s = stateRef.current
  const adReady = now >= adReadyAt
  const adCooldownLeft = Math.max(0, Math.ceil((adReadyAt - now) / 1000))

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-start justify-between p-3">
        <button
          type="button"
          onClick={onQuit}
          className="rounded-lg border-2 border-border bg-card px-4 py-1.5 text-sm font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e]"
        >
          Выход
        </button>
        <div className="rounded-lg border-2 border-border bg-card px-4 py-1.5 text-sm font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e]">
          {config.name}
        </div>
        <button
          type="button"
          onClick={() => adReady && setAdOpen(true)}
          disabled={!adReady}
          className="rounded-lg border-2 border-border bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_#1a1a2e] disabled:opacity-60"
        >
          {adReady ? `Реклама +${AD_REWARD}` : `Реклама через ${adCooldownLeft}с`}
        </button>
      </div>

      {/* Currency counter above our base — appears after first pickup */}
      {s.hasCollectedAnything && (
        <div
          className="absolute z-20 flex items-center gap-1.5 rounded-lg border-2 border-border bg-card px-3 py-1 shadow-[2px_2px_0_#1a1a2e]"
          style={{ left: '3%', top: '22%' }}
          aria-live="polite"
        >
          <img src="/assets/can-ded.png" alt="" className="h-6 w-6" />
          <span className="text-xl font-black text-card-foreground">{s.currency}</span>
        </div>
      )}

      {/* Our base */}
      <div className="absolute z-10" style={{ left: '1%', bottom: '18%', width: '13%' }}>
        <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full border border-border bg-card">
          <div
            className="h-full bg-secondary transition-all"
            style={{ width: `${Math.max(0, (s.playerBaseHp / config.playerBaseHp) * 100)}%` }}
          />
        </div>
        <img src="/assets/our-base.png" alt="Наша будка" className="w-full" />
      </div>

      {/* Enemy base */}
      <div className="absolute z-10" style={{ right: '1%', bottom: '18%', width: '14%' }}>
        <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full border border-border bg-card">
          <div
            className="h-full bg-destructive transition-all"
            style={{ width: `${Math.max(0, (s.enemyBaseHp / config.enemyBaseHp) * 100)}%` }}
          />
        </div>
        <img src="/assets/enemy-base.png" alt="Вражеская база" className="w-full" />
      </div>

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

      {/* Fighters */}
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
          <div className="mb-0.5 h-1.5 w-full overflow-hidden rounded-full border border-border bg-card">
            <div
              className={`h-full ${f.side === 'player' ? 'bg-secondary' : 'bg-destructive'}`}
              style={{ width: `${(f.hp / f.maxHp) * 100}%` }}
            />
          </div>
          <img
            src={f.type.image}
            alt={f.type.name}
            className={`w-full object-contain object-bottom ${f.fighting ? 'shake' : ''} ${
              f.side === 'enemy' ? '-scale-x-100' : ''
            }`}
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
              minWidth: 40,
              transform: 'translateX(-50%)',
            }}
            aria-label={
              can.kind === 'shiza'
                ? `Собрать банку от шизы, плюс ${CAN_SHIZA_VALUE}`
                : `Собрать банку Дед, плюс ${CAN_DED_VALUE}`
            }
          >
            <img
              src={can.kind === 'shiza' ? '/assets/can-shiza.png' : '/assets/can-ded.png'}
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

      {/* Spawn buttons */}
      <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 gap-3">
        {PLAYER_UNITS.map((unit) => {
          const affordable = s.currency >= unit.cost
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => spawnPlayerUnit(unit)}
              disabled={!affordable}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-4 border-border bg-card p-1.5 shadow-[3px_3px_0_#1a1a2e] transition-transform ${
                affordable
                  ? 'hover:scale-105 active:translate-y-0.5'
                  : 'cursor-not-allowed opacity-50 grayscale'
              }`}
              aria-label={`Призвать: ${unit.name} за ${unit.cost}`}
            >
              <span className="text-lg font-black leading-none text-card-foreground">
                {unit.cost}
              </span>
              <img
                src={unit.cardImage ?? unit.image}
                alt=""
                className="h-14 w-14 rounded-md object-cover md:h-16 md:w-16"
              />
            </button>
          )
        })}
      </div>

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
            stateRef.current.hasCollectedAnything = true
            setAdOpen(false)
            setAdReadyAt(Date.now() + AD_COOLDOWN_MS)
          }}
          onSkipEarly={() => setAdOpen(false)}
        />
      )}
    </div>
  )
}
