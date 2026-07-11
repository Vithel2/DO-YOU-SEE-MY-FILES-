'use client'

import { useEffect, useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { is67Unlocked } from '@/lib/progress'

interface LevelsScreenProps {
  maxUnlockedLevel: number
  onStartLevel: (level: number) => void
  onBack: () => void
}

const LEVEL_PREVIEWS: Record<number, { image: string; hint: string }> = {
  1: { image: '/assets/danil.png', hint: 'Данил и Лунтик' },
  2: { image: '/assets/driggert.png', hint: 'Появляются Саша и Дриггерт!' },
  3: { image: '/assets/luntik.png', hint: 'Враги лезут быстрее!' },
  4: { image: '/assets/sasha.png', hint: 'Саша и Дриггерт наступают!' },
  5: { image: '/assets/enemy-base.png', hint: 'Финальная битва!' },
  6: { image: '/assets/red-arseniy.png', hint: 'ЖЕСТЬ. Просто жесть.' },
  7: { image: '/assets/vitalik.png', hint: 'Шесть-семь!' },
}

export function LevelsScreen({ maxUnlockedLevel, onStartLevel, onBack }: LevelsScreenProps) {
  const [secretOpen, setSecretOpen] = useState(false)
  useEffect(() => {
    setSecretOpen(is67Unlocked())
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h1
        className="text-balance text-center text-4xl font-black text-white md:text-5xl"
        style={{ textShadow: '3px 3px 0 #1a1a2e, -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e' }}
      >
        Уровни
      </h1>

      <div className="flex flex-wrap items-stretch justify-center gap-4 md:gap-6">
        {LEVELS.map((lvl) => {
          const isSecret = lvl.level === 7
          // Level 7 is always shown but only unlocks via the secret code
          const locked = isSecret ? !secretOpen : lvl.level > maxUnlockedLevel
          const preview = LEVEL_PREVIEWS[lvl.level]
          return (
            <button
              key={lvl.level}
              type="button"
              onClick={() => !locked && onStartLevel(lvl.level)}
              disabled={locked}
              className={`flex w-40 flex-col items-center gap-2 rounded-2xl border-4 bg-card p-4 shadow-[5px_5px_0_#1a1a2e] transition-transform sm:w-48 ${
                isSecret ? 'border-secondary' : 'border-border'
              } ${
                locked
                  ? 'cursor-not-allowed opacity-60 grayscale'
                  : 'hover:scale-105 active:translate-y-1'
              }`}
              aria-label={locked ? `${lvl.name} закрыт` : `Играть ${lvl.name}`}
            >
              <span className="text-2xl font-black text-card-foreground">{lvl.name}</span>
              <div className="flex h-24 items-end justify-center sm:h-28">
                {locked ? (
                  <span className="text-6xl font-black text-muted" aria-hidden="true">
                    ?
                  </span>
                ) : (
                  <img
                    src={preview?.image ?? '/assets/danil.png'}
                    alt=""
                    className="h-full w-auto object-contain drop-shadow-md"
                  />
                )}
              </div>
              <span className="text-pretty text-center text-xs font-bold text-card-foreground sm:text-sm">
                {locked
                  ? isSecret
                    ? 'Код: число деградации'
                    : 'Пройди предыдущий уровень!'
                  : preview?.hint}
              </span>
              {!locked && (
                <span className="mt-1 rounded-lg border-2 border-border bg-primary px-4 py-1 text-sm font-black text-primary-foreground shadow-[2px_2px_0_#1a1a2e]">
                  ИГРАТЬ
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border-2 border-border bg-card px-8 py-2 text-lg font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105"
      >
        Назад
      </button>
    </div>
  )
}
