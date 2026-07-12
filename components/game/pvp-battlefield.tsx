'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAN_DED_VALUE,
  CAN_FALL_DURATION_MS,
  CAN_GROUND_LIFETIME_MS,
  CAN_SHIZA_VALUE,
  CAN_SPAWN_INTERVAL_MS,
  PLAYER_UNITS,
  type UnitType,
} from '@/lib/game-data'
import { pollMatch, reportResult, sendCommand } from '@/app/actions/pvp'
import { createLoop, playDeathSound, playSound } from '@/lib/sound'

/* ----------------------------------------------------------------------------
 * PvP battle: both players run their own local simulation.
 * My purchases go to the server; the opponent's purchases arrive via polling
 * and spawn as mirrored enemy units with identical stats. Each player sees
 * themself on the LEFT — the opponent's Arseniys are my "enemies".
 * -------------------------------------------------------------------------- */

interface Fighter {
  uid: number
  type: UnitType
  side: 'player' | 'enemy'
  x: number
  hp: number
  maxHp: number
  attackCooldown: number
  fighting: boolean
}

interface FallingCan {
  uid: number
  kind: 'ded' | 'shiza'
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

interface PvpState {
  currency: number
  myBaseHp: number
  oppBaseHp: number
  fighters: Fighter[]
  cans: FallingCan[]
  floatTexts: FloatText[]
  result: 'playing' | 'victory' | 'defeat'
  explosion: 'none' | 'player' | 'enemy'
}

const PVP_BASE_HP = 300
const PLAYER_BASE_X = 6
const ENEMY_BASE_X = 94
const PLAYER_SPAWN_X = 12
const ENEMY_SPAWN_X = 88
const FIGHT_RANGE = 4
const BASE_RANGE = 3
const ATTACK_INTERVAL = 1
const POLL_MS = 1200

let uidCounter = 100000
function nextUid() {
  uidCounter += 1
  return uidCounter
}

interface PvpBattlefieldProps {
  matchId: string
  onExit: () => void
}

export function PvpBattlefield({ matchId, onExit }: PvpBattlefieldProps) {
  const stateRef = useRef<PvpState>({
    currency: 10,
    myBaseHp: PVP_BASE_HP,
    oppBaseHp: PVP_BASE_HP,
    fighters: [],
    cans: [],
    floatTexts: [],
    result: 'playing',
    explosion: 'none',
  })
  const [, forceRender] = useState(0)
  const [opp, setOpp] = useState<{ name: string; elo: number } | null>(null)
  const [myElo, setMyElo] = useState<number | null>(null)
  const [finished, setFinished] = useState<{
    iWon: boolean
    eloDelta: number
    byDisconnect: boolean
  } | null>(null)
  const finishedRef = useRef(false)
  const reportedRef = useRef(false)
  const lastCmdIdRef = useRef(0)
  const canTimerRef = useRef(0)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
  }, [])

  // stoppable base explosion so quitting cuts the sound
  const boomRef = useRef<ReturnType<typeof createLoop> | null>(null)
  if (boomRef.current === null) boomRef.current = createLoop('base-explosion', 0.8, false)
  useEffect(() => {
    const boom = boomRef.current
    return () => boom?.stop()
  }, [])

  /* --- polling loop: heartbeat + opponent commands + result --- */
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const res = await pollMatch(matchId, lastCmdIdRef.current)
        if (!alive) return
        if (res.ok) {
          if (res.opponentName && res.opponentElo !== null && !opp) {
            setOpp({ name: res.opponentName, elo: res.opponentElo })
          }
          if (myElo === null) setMyElo(res.myElo)

          // spawn opponent units from their commands
          for (const cmd of res.commands) {
            lastCmdIdRef.current = Math.max(lastCmdIdRef.current, cmd.id)
            const type = PLAYER_UNITS.find((u) => u.id === cmd.unitId)
            if (!type) continue
            stateRef.current.fighters.push({
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

          // server says the match is over (opponent reported or disconnected)
          if (res.status === 'finished' && !finishedRef.current) {
            finishedRef.current = true
            const iWon = res.iWon ?? false
            const s = stateRef.current
            s.result = iWon ? 'victory' : 'defeat'
            s.explosion = iWon ? 'enemy' : 'player'
            boomRef.current?.start()
            setFinished({
              iWon,
              eloDelta: res.myEloDelta ?? 0,
              byDisconnect: s.oppBaseHp > 0 && s.myBaseHp > 0,
            })
            return // stop polling
          }
          if (res.status === 'gone' && !finishedRef.current) {
            finishedRef.current = true
            setFinished({ iWon: true, eloDelta: 0, byDisconnect: true })
            return
          }
        }
      } catch {
        // network blip — keep trying
      }
      if (alive && !finishedRef.current) timer = setTimeout(poll, POLL_MS)
    }
    poll()

    return () => {
      alive = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  /* --- report my local result to the server (first reporter closes it) --- */
  const report = useCallback(
    async (iWon: boolean) => {
      if (reportedRef.current) return
      reportedRef.current = true
      try {
        await reportResult(matchId, iWon)
        // the poll loop already stopped; fetch the final state once for elo
        const res = await pollMatch(matchId, lastCmdIdRef.current)
        if (res.ok && res.status === 'finished' && !finished) {
          setFinished({
            iWon: res.iWon ?? iWon,
            eloDelta: res.myEloDelta ?? 0,
            byDisconnect: false,
          })
        }
      } catch {
        // even if reporting fails, show the local result
        if (!finished) setFinished({ iWon, eloDelta: 0, byDisconnect: false })
      }
    },
    [matchId, finished],
  )

  /* --- main 60fps game loop --- */
  useEffect(() => {
    let raf: number
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const s = stateRef.current

      if (s.result === 'playing' && !finishedRef.current) {
        // --- my own cans (independent random per player, same rates) ---
        canTimerRef.current += dt * 1000
        if (canTimerRef.current >= CAN_SPAWN_INTERVAL_MS) {
          canTimerRef.current = 0
          s.cans.push({
            uid: nextUid(),
            kind: Math.random() < 0.25 ? 'shiza' : 'ded',
            x: 15 + Math.random() * 65,
            spawnedAt: Date.now(),
            collected: false,
          })
        }
        const nowMs = Date.now()
        s.cans = s.cans.filter(
          (c) => !c.collected && nowMs - c.spawnedAt < CAN_FALL_DURATION_MS + CAN_GROUND_LIFETIME_MS,
        )

        // --- movement & combat (same rules as singleplayer) ---
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
            if (f.side === 'player') {
              if (f.x >= ENEMY_BASE_X - BASE_RANGE) {
                if (f.attackCooldown <= 0) {
                  s.oppBaseHp -= f.type.damage
                  f.attackCooldown = ATTACK_INTERVAL
                }
              } else {
                f.x += f.type.speed * dt
              }
            } else {
              if (f.x <= PLAYER_BASE_X + BASE_RANGE) {
                if (f.attackCooldown <= 0) {
                  s.myBaseHp -= f.type.damage
                  f.attackCooldown = ATTACK_INTERVAL
                }
              } else {
                f.x -= f.type.speed * dt
              }
            }
          }
        }

        const before = s.fighters.length
        s.fighters = s.fighters.filter((f) => f.hp > 0)
        if (s.fighters.length < before) playDeathSound()

        // --- win / lose: report to the server, it decides atomically ---
        if (s.oppBaseHp <= 0) {
          s.result = 'victory'
          s.explosion = 'enemy'
          boomRef.current?.start()
          report(true)
        } else if (s.myBaseHp <= 0) {
          s.result = 'defeat'
          s.explosion = 'player'
          boomRef.current?.start()
          report(false)
        }
      }

      forceRender((v) => v + 1)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [report])

  /* --- actions --- */
  const collectCan = useCallback((can: FallingCan) => {
    const s = stateRef.current
    if (can.collected || s.result !== 'playing') return
    can.collected = true
    const value = can.kind === 'shiza' ? CAN_SHIZA_VALUE : CAN_DED_VALUE
    s.currency += value
    const progress = Math.min((Date.now() - can.spawnedAt) / CAN_FALL_DURATION_MS, 1)
    s.floatTexts.push({ uid: nextUid(), x: can.x, y: 8 + progress * 62, text: `+${value}` })
    const textUid = s.floatTexts[s.floatTexts.length - 1].uid
    setTimeout(() => {
      stateRef.current.floatTexts = stateRef.current.floatTexts.filter((ft) => ft.uid !== textUid)
    }, 900)
  }, [])

  const buyUnit = useCallback(
    (type: UnitType) => {
      const s = stateRef.current
      if (s.result !== 'playing' || finishedRef.current) return
      if (s.currency < type.cost) return
      s.currency -= type.cost
      playSound('spawn')
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
      // fire-and-forget: the opponent picks this up on their next poll
      sendCommand(matchId, type.id).catch(() => {})
    },
    [matchId],
  )

  /** Quit mid-match = forfeit (opponent gets the win) */
  const handleQuit = useCallback(() => {
    boomRef.current?.stop()
    if (!finishedRef.current && stateRef.current.result === 'playing') {
      reportResult(matchId, false).catch(() => {})
    }
    onExit()
  }, [matchId, onExit])

  const s = stateRef.current

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/background.png')", touchAction: 'none' }}
    >
      {/* Top bar: me VS opponent + both base HP */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-start justify-between gap-2 p-2 md:p-3">
        <button
          type="button"
          onClick={handleQuit}
          className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e] md:px-4 md:text-sm"
        >
          Сдаться
        </button>

        <div className="flex w-[60%] max-w-xl flex-col gap-1">
          <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-1 text-xs font-black text-card-foreground shadow-[2px_2px_0_#1a1a2e] md:text-sm">
            <span className="text-primary">Ты{myElo !== null ? ` (${myElo})` : ''}</span>
            <span>VS</span>
            <span className="text-destructive">
              {opp ? `${opp.name} (${opp.elo})` : '...'}
            </span>
          </div>
          <div className="flex gap-1">
            <div className="h-3 flex-1 overflow-hidden rounded-full border border-border bg-card md:h-4">
              <div
                className="h-full bg-secondary transition-all"
                style={{ width: `${Math.max(0, (s.myBaseHp / PVP_BASE_HP) * 100)}%` }}
              />
            </div>
            <div className="h-3 flex-1 overflow-hidden rounded-full border border-border bg-card md:h-4">
              <div
                className="ml-auto h-full bg-destructive transition-all"
                style={{ width: `${Math.max(0, (s.oppBaseHp / PVP_BASE_HP) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* currency */}
        <div className="flex items-center gap-1.5 rounded-lg border-2 border-border bg-card px-2.5 py-1 shadow-[2px_2px_0_#1a1a2e] md:px-3">
          <img src="/assets/can-ded.png" alt="" className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-lg font-black text-card-foreground md:text-xl">{s.currency}</span>
        </div>
      </div>

      {/* my base */}
      <div className="absolute z-10" style={{ left: '1%', bottom: '18%', width: '13%' }}>
        <img src="/assets/our-base.png" alt="Наша будка" className="w-full" />
      </div>

      {/* opponent base */}
      <div className="absolute z-10" style={{ right: '1%', bottom: '18%', width: '14%' }}>
        <img src="/assets/enemy-base.png" alt="База соперника" className="w-full" />
      </div>

      {/* explosion on the destroyed base */}
      {s.explosion !== 'none' && (
        <video
          src="/assets/explosion.mp4"
          autoPlay
          muted
          playsInline
          className="absolute z-30 w-[22%] mix-blend-screen"
          style={
            s.explosion === 'enemy' ? { right: '0%', bottom: '16%' } : { left: '0%', bottom: '16%' }
          }
        />
      )}

      {/* fighters — opponent units are the same Arseniys, mirrored */}
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
          <img
            src={f.fighting && f.type.attackImage ? f.type.attackImage : f.type.image}
            alt={f.type.name}
            className={`w-full object-contain object-bottom ${f.fighting ? 'shake' : ''} ${
              f.side === 'enemy' ? '-scale-x-100 hue-rotate-180' : ''
            }`}
          />
        </div>
      ))}

      {/* falling cans */}
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

      {/* floating +N texts */}
      {s.floatTexts.map((ft) => (
        <span
          key={ft.uid}
          className="float-up pointer-events-none absolute z-30 text-2xl font-black text-primary"
          style={{ left: `${ft.x}%`, top: `${ft.y}%`, textShadow: '2px 2px 0 #1a1a2e' }}
        >
          {ft.text}
        </span>
      ))}

      {/* shop — same three Arseniys for both players, no pill/ads (fair!) */}
      <div className="absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 items-end gap-2 md:bottom-2 md:gap-3">
        {PLAYER_UNITS.map((unit) => {
          const affordable = s.currency >= unit.cost
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => buyUnit(unit)}
              disabled={!affordable}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-4 border-border bg-card p-1 shadow-[3px_3px_0_#1a1a2e] transition-transform md:p-1.5 ${
                affordable
                  ? 'hover:scale-105 active:translate-y-0.5'
                  : 'cursor-not-allowed opacity-50 grayscale'
              } ${isTouch ? 'touch-none' : ''}`}
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
      </div>

      {/* result overlay */}
      {finished && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-4 bg-card p-8 shadow-[6px_6px_0_#1a1a2e] ${
              finished.iWon ? 'border-primary' : 'border-destructive'
            }`}
          >
            <h2
              className={`text-5xl font-black ${finished.iWon ? 'text-primary' : 'text-destructive'}`}
            >
              {finished.iWon ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
            </h2>
            {finished.byDisconnect && (
              <p className="text-center text-base font-bold text-muted-foreground">
                Соперник сбежал с поля боя!
              </p>
            )}
            <p className="text-3xl font-black">
              <span className={finished.eloDelta >= 0 ? 'text-primary' : 'text-destructive'}>
                {finished.eloDelta >= 0 ? `+${finished.eloDelta}` : finished.eloDelta} эло
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                boomRef.current?.stop()
                onExit()
              }}
              className="rounded-xl border-4 border-border bg-primary px-8 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              В лобби
            </button>
          </div>
        </div>
      )}

      {/* waiting for the opponent's info */}
      {!opp && !finished && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e]">
          Подключаем соперника...
        </div>
      )}
    </div>
  )
}
