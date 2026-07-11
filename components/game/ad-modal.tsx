'use client'

import { useState } from 'react'
import { AD_REWARD } from '@/lib/game-data'

interface AdModalProps {
  onFinished: () => void
  onSkipEarly: () => void
}

export function AdModal({ onFinished, onSkipEarly }: AdModalProps) {
  const [ended, setEnded] = useState(false)

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Рекламный ролик"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border-4 border-border bg-card p-5 shadow-[8px_8px_0_#1a1a2e]">
        <h2 className="text-2xl font-black text-card-foreground">
          {ended ? 'Награда получена!' : 'Реклама...'}
        </h2>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src="/assets/ad.mp4"
          autoPlay
          playsInline
          onEnded={() => setEnded(true)}
          className="w-full rounded-lg border-2 border-border"
        />
        {ended ? (
          <button
            type="button"
            onClick={onFinished}
            className="rounded-xl border-4 border-border bg-primary px-10 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            {`Забрать +${AD_REWARD}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSkipEarly}
            className="text-sm font-medium text-muted underline"
          >
            Закрыть без награды
          </button>
        )}
      </div>
    </div>
  )
}
