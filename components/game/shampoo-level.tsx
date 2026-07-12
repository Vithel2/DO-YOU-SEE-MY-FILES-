'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveMatchStats } from '@/app/actions/stats'
import { markCharacterMet } from '@/lib/progress'
import { createLoop, playFile, stopMusic } from '@/lib/sound'

/**
 * Secret horror level «Саша VS Шампунь» (code: Вонючка).
 *
 * You play as Sasha. He has no legs, so he hovers on a cloud of his own
 * green stink gas. A giant shampoo bottle chases him through a dark
 * corridor to WASH him. Sasha must run and find the Evil Arseniy Clone —
 * peaceful here — who destroys the shampoo with his eye lasers.
 */

interface ShampooLevelProps {
  onQuit: () => void
}

// world geometry (stage units, 1280x720)
const WORLD_LENGTH = 3400
const ARSENIY_X = 3000
const SASHA_START_X = 300
const SHAMPOO_START_X = -500
const CATCH_DISTANCE = 70

// movement
const SASHA_SPEED = 265
const SASHA_TIRED_SPEED = 130
const SHAMPOO_BASE_SPEED = 205
const SHAMPOO_ACCEL = 3.2 // px/s gained per second — it WILL catch you if you idle

interface GasPuff {
  id: number
  x: number
  y: number
  born: number
}

type Phase = 'intro' | 'running' | 'cutscene' | 'victory' | 'defeat'

export function ShampooLevel({ onQuit }: ShampooLevelProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [, forceRender] = useState(0)

  const stateRef = useRef({
    sashaX: SASHA_START_X,
    shampooX: SHAMPOO_START_X,
    shampooSpeed: SHAMPOO_BASE_SPEED,
    stamina: 100,
    dir: 0 as -1 | 0 | 1,
    elapsed: 0,
    cutsceneAt: 0,
    lasersOn: false,
    shampooDead: false,
  })
  const gasRef = useRef<GasPuff[]>([])
  const gasIdRef = useRef(0)
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase
  const resultSentRef = useRef(false)

  // held keys / touch buttons
  const heldRef = useRef({ left: false, right: false })

  // heartbeat-ish tension loop (reuse radiation hiss as creepy ambience)
  const ambienceRef = useRef<ReturnType<typeof createLoop> | null>(null)
  if (ambienceRef.current === null) ambienceRef.current = createLoop('radiation', 0.25)

  useEffect(() => {
    stopMusic()
    const amb = ambienceRef.current
    return () => amb?.stop()
  }, [])

  const sendResult = useCallback((won: boolean) => {
    if (resultSentRef.current) return
    resultSentRef.current = true
    saveMatchStats({
      enemiesKilled: won ? 1 : 0, // the shampoo counts as one enemy
      currencyEarned: 0,
      victory: won,
      superArseniys: 0,
      level: 9,
      shampooWin: won,
    }).catch(() => {})
  }, [])

  // keyboard controls
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')
        heldRef.current.right = true
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')
        heldRef.current.left = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')
        heldRef.current.right = false
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')
        heldRef.current.left = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // main game loop
  useEffect(() => {
    if (phase !== 'running' && phase !== 'cutscene') return
    let raf = 0
    let last = performance.now()
    let gasTimer = 0

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = stateRef.current
      s.elapsed += dt

      if (phaseRef.current === 'running') {
        // Sasha movement (hover-run on his gas cloud)
        const right = heldRef.current.right
        const left = heldRef.current.left
        s.dir = right && !left ? 1 : left && !right ? -1 : 0
        const running = s.dir !== 0
        if (running) {
          s.stamina = Math.max(0, s.stamina - 13 * dt)
          const speed = s.stamina > 0 ? SASHA_SPEED : SASHA_TIRED_SPEED
          s.sashaX = Math.min(WORLD_LENGTH - 120, Math.max(80, s.sashaX + s.dir * speed * dt))
        } else {
          s.stamina = Math.min(100, s.stamina + 22 * dt)
        }

        // stink gas trail
        gasTimer += dt
        if (gasTimer > 0.13) {
          gasTimer = 0
          gasRef.current.push({
            id: gasIdRef.current++,
            x: s.sashaX - 20 + Math.random() * 40,
            y: 150 + Math.random() * 60,
            born: s.elapsed,
          })
        }

        // shampoo relentlessly speeds up
        s.shampooSpeed += SHAMPOO_ACCEL * dt
        s.shampooX += s.shampooSpeed * dt

        // caught → washed → defeat
        if (s.shampooX + CATCH_DISTANCE >= s.sashaX) {
          setPhase('defeat')
          sendResult(false)
          playFile('death1', 0.8)
          return
        }

        // reached the peaceful Evil Clone → laser cutscene
        if (s.sashaX >= ARSENIY_X - 120) {
          markCharacterMet('shampoo')
          s.cutsceneAt = s.elapsed
          setPhase('cutscene')
        }
      } else if (phaseRef.current === 'cutscene') {
        // shampoo keeps approaching during the cutscene for maximum drama
        if (!s.shampooDead) {
          s.shampooX += Math.max(120, s.shampooSpeed * 0.6) * dt
          const t = s.elapsed - s.cutsceneAt
          if (t > 0.9 && !s.lasersOn) {
            s.lasersOn = true
            playFile('death2', 0.9)
          }
          if (t > 2.1) {
            s.shampooDead = true
            playFile('base-explosion', 0.8)
          }
        } else if (s.elapsed - s.cutsceneAt > 3.4) {
          setPhase('victory')
          sendResult(true)
          playFile('win', 0.8)
          return
        }
      }

      // clean old gas puffs
      gasRef.current = gasRef.current.filter((g) => s.elapsed - g.born < 1.6)

      forceRender((n) => n + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, sendResult])

  const start = () => {
    ambienceRef.current?.start()
    setPhase('running')
  }

  const restart = () => {
    stateRef.current = {
      sashaX: SASHA_START_X,
      shampooX: SHAMPOO_START_X,
      shampooSpeed: SHAMPOO_BASE_SPEED,
      stamina: 100,
      dir: 0,
      elapsed: 0,
      cutsceneAt: 0,
      lasersOn: false,
      shampooDead: false,
    }
    gasRef.current = []
    resultSentRef.current = false
    heldRef.current = { left: false, right: false }
    ambienceRef.current?.start()
    setPhase('running')
  }

  const quit = () => {
    ambienceRef.current?.stop()
    onQuit()
  }

  const s = stateRef.current
  // camera follows Sasha, clamped to world bounds
  const camera = Math.min(WORLD_LENGTH - 1280, Math.max(0, s.sashaX - 420))
  const sashaLeft = s.sashaX - camera
  const shampooLeft = s.shampooX - camera
  const arseniyLeft = ARSENIY_X - camera
  const gapPct = Math.min(100, Math.max(0, ((s.sashaX - s.shampooX - CATCH_DISTANCE) / 900) * 100))
  const progressPct = Math.min(100, ((s.sashaX - SASHA_START_X) / (ARSENIY_X - 120 - SASHA_START_X)) * 100)

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#07070d]">
      {/* Dark corridor location: floor, creepy pillars, fog */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #050509 0%, #0a0a14 55%, #10101e 72%, #05050a 100%)',
        }}
      />
      {/* pillars scrolling with the camera */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 220px, #14142a 220px, #1a1a33 250px, transparent 250px, transparent 400px)',
          backgroundPositionX: `${-camera * 0.6}px`,
        }}
      />
      {/* floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[26%]"
        style={{
          background: 'linear-gradient(180deg, #101020 0%, #07070d 100%)',
          borderTop: '3px solid #1c1c38',
        }}
      />
      {/* flickering light + vignette */}
      <div className="shampoo-flicker pointer-events-none absolute inset-0 bg-white/5" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 180px 90px rgba(0,0,0,0.92)' }}
      />

      {/* green stink gas trail */}
      {gasRef.current.map((g) => {
        const age = s.elapsed - g.born
        return (
          <div
            key={g.id}
            className="absolute rounded-full"
            style={{
              left: g.x - camera - 25,
              bottom: g.y,
              width: 50 + age * 40,
              height: 50 + age * 40,
              background: 'radial-gradient(circle, rgba(80,220,60,0.5) 0%, rgba(60,180,40,0) 70%)',
              opacity: Math.max(0, 1 - age / 1.6),
            }}
            aria-hidden="true"
          />
        )
      })}

      {/* Sasha — no legs, hovering on his own gas cloud */}
      {phase !== 'defeat' && (
        <div
          className="absolute z-10"
          style={{ left: sashaLeft - 55, bottom: '20%', width: 110 }}
        >
          {/* gas cloud he rides on */}
          <div
            className="shampoo-hover absolute -bottom-8 left-1/2 h-16 w-32 -translate-x-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse, rgba(90,230,70,0.75) 0%, rgba(70,200,50,0.25) 60%, transparent 80%)',
            }}
            aria-hidden="true"
          />
          <div className="shampoo-hover relative">
            <img
              src="/assets/sasha-hero.png"
              alt="Саша парит на облаке вони"
              className={`w-full object-contain ${s.dir === -1 ? '-scale-x-100' : ''}`}
            />
          </div>
        </div>
      )}

      {/* The shampoo — giant, menacing, slightly tilted as it lunges */}
      {!s.shampooDead && (
        <div
          className="absolute z-10"
          style={{ left: shampooLeft - 80, bottom: '17%', width: 160 }}
        >
          <img
            src="/assets/shampoo.png"
            alt="Гигантский шампунь гонится за Сашей"
            className="shampoo-lunge w-full object-contain drop-shadow-[0_0_25px_rgba(120,170,255,0.55)]"
          />
          {/* soap bubbles */}
          <div className="shampoo-hover absolute -top-5 left-3 h-4 w-4 rounded-full bg-white/50" aria-hidden="true" />
          <div className="shampoo-hover absolute -top-9 left-12 h-3 w-3 rounded-full bg-white/40" aria-hidden="true" />
        </div>
      )}
      {/* shampoo death explosion */}
      {s.shampooDead && phase === 'cutscene' && (
        <div
          className="absolute z-10 animate-ping rounded-full"
          style={{
            left: shampooLeft - 70,
            bottom: '18%',
            width: 150,
            height: 150,
            background: 'radial-gradient(circle, rgba(255,200,80,0.95) 0%, rgba(255,90,40,0.5) 55%, transparent 75%)',
          }}
          aria-hidden="true"
        />
      )}

      {/* The peaceful Evil Arseniy Clone waiting at the end */}
      <div className="absolute z-10" style={{ left: arseniyLeft - 75, bottom: '19%', width: 150 }}>
        <img
          src="/assets/evil-clone.png"
          alt="Мирный Злой Клон Арсения"
          className="w-full -scale-x-100 object-contain drop-shadow-[0_0_20px_rgba(255,60,60,0.4)]"
        />
        {/* eye lasers during the cutscene */}
        {s.lasersOn && !s.shampooDead && (
          <div
            className="absolute top-[22%] right-[70%] h-2"
            style={{
              width: Math.max(60, arseniyLeft - shampooLeft - 40),
              background: 'linear-gradient(90deg, rgba(255,40,40,0.2) 0%, #ff2a2a 30%, #ffb3b3 50%, #ff2a2a 70%, rgba(255,40,40,0.2) 100%)',
              boxShadow: '0 0 18px 6px rgba(255,40,40,0.8)',
              transform: 'translateX(-100%)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* HUD */}
      {(phase === 'running' || phase === 'cutscene') && (
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-3 p-3">
          <button
            type="button"
            onClick={quit}
            className="rounded-lg border-2 border-border bg-card/80 px-3 py-1.5 text-sm font-bold text-card-foreground"
          >
            Выйти
          </button>
          <div className="flex flex-1 flex-col gap-1 px-2">
            {/* distance from shampoo */}
            <div className="h-3 w-full overflow-hidden rounded-full border border-white/20 bg-black/60">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${gapPct}%`,
                  background: gapPct < 30 ? '#ff3b3b' : gapPct < 60 ? '#ffb020' : '#54d64a',
                }}
              />
            </div>
            <span className="text-center text-[11px] font-black tracking-wide text-white/70">
              {gapPct < 30 ? 'ОН БЛИЗКО!!! БЕГИ!!!' : 'Отрыв от шампуня'}
            </span>
          </div>
          <div className="flex w-40 flex-col gap-1">
            <div className="h-3 w-full overflow-hidden rounded-full border border-white/20 bg-black/60">
              <div
                className="h-full rounded-full bg-[#4ac2ff] transition-[width]"
                style={{ width: `${s.stamina}%` }}
              />
            </div>
            <span className="text-center text-[11px] font-black tracking-wide text-white/70">
              Силы (вонючесть)
            </span>
          </div>
        </div>
      )}
      {/* progress to the clone */}
      {(phase === 'running' || phase === 'cutscene') && (
        <div className="absolute bottom-2 left-1/2 z-20 w-1/2 -translate-x-1/2">
          <div className="h-2 w-full overflow-hidden rounded-full border border-white/15 bg-black/60">
            <div className="h-full rounded-full bg-[#ff5c5c]" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1 text-center text-[11px] font-bold text-white/60">
            Найди Злого Клона Арсения — только он спасёт тебя от мытья
          </p>
        </div>
      )}

      {/* touch controls */}
      {phase === 'running' && (
        <div className="absolute bottom-14 left-0 right-0 z-20 flex justify-between px-6 md:hidden">
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-label={side === 'left' ? 'Бежать налево' : 'Бежать направо'}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-3xl font-black text-white/80 active:bg-white/25"
              onPointerDown={() => {
                heldRef.current[side] = true
              }}
              onPointerUp={() => {
                heldRef.current[side] = false
              }}
              onPointerLeave={() => {
                heldRef.current[side] = false
              }}
            >
              {side === 'left' ? '<' : '>'}
            </button>
          ))}
        </div>
      )}

      {/* intro */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-6">
          <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
            <h1 className="shampoo-flicker text-balance text-4xl font-black text-[#ff3b3b] md:text-5xl">
              САША VS ШАМПУНЬ
            </h1>
            <img src="/assets/shampoo.png" alt="" className="h-24 object-contain opacity-80" />
            <p className="text-pretty text-base font-bold leading-relaxed text-white/85">
              Саша воняет так жёстко, что парит на облаке собственного газа. Но за ним гонится
              ШАМПУНЬ, чтобы ПОМЫТЬ его... Беги вправо (стрелки или кнопки), не дай себя отмыть!
              Где-то в темноте ждёт Злой Клон Арсения — здесь он мирный и поможет тебе.
            </p>
            <p className="text-sm font-bold text-white/50">
              Силы кончаются, если бежать без остановки. Остановишься — восстановятся. Но шампунь
              не останавливается НИКОГДА.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={start}
                className="rounded-xl border-2 border-border bg-primary px-8 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#000] transition-transform hover:scale-105"
              >
                БЕЖАТЬ
              </button>
              <button
                type="button"
                onClick={quit}
                className="rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-lg font-bold text-white/80"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      )}

      {/* victory */}
      {phase === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-6">
          <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
            <h2 className="text-balance text-4xl font-black text-[#54d64a]">
              ЭКСКЛЮЗИВНАЯ ПОБЕДА НАД ШАМПУНЕМ!
            </h2>
            <p className="text-pretty text-lg font-bold leading-relaxed text-white/85">
              Злой Клон Арсения испарил шампунь лазерами из глаз. Саша остался немытым и счастливым.
              Вонь победила чистоту!
            </p>
            <p className="text-sm font-bold text-white/50">
              Победа записана в лидерборды с приметкой «секретно»
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={restart}
                className="rounded-xl border-2 border-border bg-primary px-6 py-3 text-lg font-black text-primary-foreground shadow-[4px_4px_0_#000] transition-transform hover:scale-105"
              >
                Ещё раз
              </button>
              <button
                type="button"
                onClick={quit}
                className="rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-lg font-bold text-white/80"
              >
                В меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* defeat — washed */}
      {phase === 'defeat' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#8ec9ff]/25 p-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl bg-black/80 p-8 text-center">
            <h2 className="text-balance text-4xl font-black text-[#4ac2ff]">ТЕБЯ ПОМЫЛИ!</h2>
            <p className="text-pretty text-lg font-bold leading-relaxed text-white/85">
              Шампунь догнал Сашу... Теперь он чистый, пахнет Old Spice и больше не парит.
              Позор для вонючки.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={restart}
                className="rounded-xl border-2 border-border bg-primary px-6 py-3 text-lg font-black text-primary-foreground shadow-[4px_4px_0_#000] transition-transform hover:scale-105"
              >
                Ещё раз
              </button>
              <button
                type="button"
                onClick={quit}
                className="rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-lg font-bold text-white/80"
              >
                В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
