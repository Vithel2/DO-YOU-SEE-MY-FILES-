'use client'

interface EndScreenProps {
  result: 'victory' | 'defeat'
  level: number
  hasNextLevel: boolean
  onRetry: () => void
  onNextLevel: () => void
  onMenu: () => void
}

export function EndScreen({
  result,
  level,
  hasNextLevel,
  onRetry,
  onNextLevel,
  onMenu,
}: EndScreenProps) {
  const isVictory = result === 'victory'

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-title"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border-4 border-border bg-card p-8 shadow-[8px_8px_0_#1a1a2e]">
        <h2
          id="end-title"
          className={`text-balance text-center text-5xl font-black ${
            isVictory ? 'text-secondary' : 'text-destructive'
          }`}
        >
          {isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
        </h2>
        <p className="text-pretty text-center text-lg font-medium leading-relaxed text-card-foreground">
          {isVictory
            ? `Вражеская база уничтожена! Уровень ${level} пройден.`
            : 'Твою будку разнесли... Попробуй ещё раз!'}
        </p>
        <img
          src={isVictory ? '/assets/arseniy-os.png' : '/assets/luntik.png'}
          alt={isVictory ? 'Довольный Арсений' : 'Лунтик празднует'}
          className="h-36 w-auto object-contain"
        />
        <div className="flex flex-wrap justify-center gap-3">
          {isVictory && hasNextLevel && (
            <button
              type="button"
              onClick={onNextLevel}
              className="rounded-xl border-4 border-border bg-primary px-8 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              Уровень {level + 1}
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border-4 border-border bg-secondary px-8 py-3 text-xl font-black text-secondary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Заново
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="rounded-xl border-2 border-border bg-card px-6 py-3 text-lg font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            В меню
          </button>
        </div>
      </div>
    </div>
  )
}
