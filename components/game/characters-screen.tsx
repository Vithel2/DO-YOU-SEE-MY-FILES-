'use client'

import { useEffect, useState } from 'react'
import { GALLERY_CHARACTERS } from '@/lib/game-data'
import { getMetCharacters } from '@/lib/progress'

interface CharactersScreenProps {
  onBack: () => void
}

export function CharactersScreen({ onBack }: CharactersScreenProps) {
  const [met, setMet] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setMet(getMetCharacters())
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col items-center gap-5 overflow-y-auto bg-cover bg-center p-4 pb-8"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h1
        className="mt-2 text-balance text-center text-4xl font-black text-white md:text-5xl"
        style={{ textShadow: '3px 3px 0 #1a1a2e, -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e' }}
      >
        Персонажи
      </h1>
      <p
        className="text-pretty text-center text-sm font-bold text-primary md:text-base"
        style={{ textShadow: '2px 2px 0 #1a1a2e' }}
      >
        Встреть персонажа в бою, чтобы открыть его в галерее!
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {GALLERY_CHARACTERS.map((ch) => {
          const unlocked = met.has(ch.id)
          return (
            <div
              key={ch.id}
              className={`flex w-36 flex-col items-center gap-1.5 rounded-2xl border-4 p-3 shadow-[4px_4px_0_#1a1a2e] sm:w-40 ${
                ch.side === 'player' ? 'border-secondary' : 'border-destructive'
              } ${unlocked ? 'bg-card' : 'bg-card opacity-80'}`}
            >
              <div className="flex h-24 items-end justify-center sm:h-28">
                {unlocked ? (
                  <img
                    src={ch.image}
                    alt={ch.name}
                    className="h-full w-auto object-contain drop-shadow-md"
                  />
                ) : (
                  <span
                    className="text-7xl font-black text-muted"
                    aria-label="Персонаж ещё не открыт"
                  >
                    ?
                  </span>
                )}
              </div>
              <span className="text-center text-sm font-black leading-tight text-card-foreground">
                {unlocked ? ch.name : '???'}
              </span>
              <span className="text-pretty text-center text-xs font-medium leading-snug text-card-foreground">
                {unlocked ? ch.description : 'Ещё не встречен в бою'}
              </span>
            </div>
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
