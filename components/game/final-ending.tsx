'use client'

import { useEffect, useState } from 'react'

interface FinalEndingProps {
  onMenu: () => void
}

/** Story shown once the player beats level 6 — the true ending of the game. */
const STORY: { text: string; image?: string }[] = [
  {
    text: 'Вражеская база взорвана. Последний уровень пройден...',
    image: '/assets/enemy-base.png',
  },
  {
    text: 'Данил, Лунтик, Саша и даже Дриггерт поняли: будку Арсения не победить.',
    image: '/assets/driggert.png',
  },
  {
    text: 'И тогда они сделали то, чего никто не ожидал... предложили мир.',
    image: '/assets/danil.png',
  },
  {
    text: 'Теперь все вместе собирают банки и охраняют будку. Даже Лунтик.',
    image: '/assets/luntik.png',
  },
  {
    text: 'Арсений победил. Друзья снова друзья.',
    image: '/assets/arseniy-super.png',
  },
]

export function FinalEnding({ onMenu }: FinalEndingProps) {
  const [step, setStep] = useState(0)
  const finished = step >= STORY.length

  // slow auto-advance so the ending feels like credits
  useEffect(() => {
    if (finished) return
    const t = setTimeout(() => setStep((s) => s + 1), 3500)
    return () => clearTimeout(t)
  }, [step, finished])

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#1a1a2e]/95 px-8 text-center">
      {!finished ? (
        <>
          {STORY[step].image && (
            <img
              src={STORY[step].image}
              alt=""
              className="h-48 w-auto drop-shadow-lg"
              key={`img-${step}`}
            />
          )}
          <p
            key={`text-${step}`}
            className="max-w-2xl text-balance text-3xl font-black leading-relaxed text-white"
            style={{ textShadow: '2px 2px 0 #1a1a2e' }}
          >
            {STORY[step].text}
          </p>
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-base font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Дальше
          </button>
        </>
      ) : (
        <>
          <h2
            className="text-7xl font-black text-primary"
            style={{ textShadow: '4px 4px 0 #1a1a2e' }}
          >
            КОНЕЦ
          </h2>
          <p className="max-w-xl text-pretty text-xl font-bold text-white/90">
            Ты прошёл все 6 уровней и спас будку. Спасибо за игру!
          </p>
          <div className="flex items-end gap-4">
            <img src="/assets/arseniy-fpu.png" alt="Арсений (ФПУ)" className="h-24 w-auto" />
            <img src="/assets/arseniy-super.png" alt="Супер Арсений" className="h-32 w-auto" />
            <img src="/assets/arseniy-os.png" alt="Арсений (ОС)" className="h-24 w-auto" />
          </div>
          <button
            type="button"
            onClick={onMenu}
            className="rounded-xl border-4 border-border bg-primary px-10 py-3 text-2xl font-black text-primary-foreground shadow-[5px_5px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            В меню
          </button>
        </>
      )}
    </div>
  )
}
