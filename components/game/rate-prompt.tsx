'use client'

import { useState } from 'react'
import { markGameRated, RUSTORE_URL } from '@/lib/progress'

interface RatePromptProps {
  /** Called when the player closes the prompt (either after rating or «потом») */
  onClose: () => void
}

/**
 * Asks the player to rate the game in RuStore.
 * Shown once after beating level 6; also reachable from the settings screen.
 */
export function RatePrompt({ onClose }: RatePromptProps) {
  const [hovered, setHovered] = useState(0)

  const openRuStore = () => {
    markGameRated()
    window.open(RUSTORE_URL, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-[#1a1a2e]/90 px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Оценить игру в RuStore"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-4 border-border bg-card px-6 py-6 text-center shadow-[6px_6px_0_#1a1a2e]">
        <img src="/assets/arseniy-super.png" alt="" className="h-24 w-auto drop-shadow-lg" />

        <h3 className="text-balance text-3xl font-black leading-tight text-card-foreground">
          Понравилась игра?
        </h3>
        <p className="text-pretty text-base font-bold leading-relaxed text-muted-foreground">
          Оцени «Арсений VS Друзья» в RuStore — это очень помогает автору и займёт 10 секунд!
        </p>

        {/* Decorative stars: pressing any of them opens RuStore */}
        <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={openRuStore}
              onMouseEnter={() => setHovered(n)}
              className="transition-transform hover:scale-125"
              aria-label={`Оценить на ${n} из 5 в RuStore`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-9 w-9 ${n <= hovered ? 'text-primary' : 'text-muted'}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.3 6.9.8-5 4.7 1.3 6.8L12 17.3 5.9 20.6 7.2 13.8l-5-4.7 6.9-.8L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openRuStore}
          className="w-full rounded-xl border-4 border-border bg-primary px-6 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105 active:translate-y-0.5"
        >
          ОЦЕНИТЬ В RUSTORE
        </button>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-muted-foreground underline decoration-2 underline-offset-2 transition-colors hover:text-card-foreground"
        >
          Потом
        </button>
      </div>
    </div>
  )
}
