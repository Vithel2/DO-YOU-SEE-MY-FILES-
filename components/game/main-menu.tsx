'use client'

interface MainMenuProps {
  maxUnlockedLevel: number
  onStartLevel: (level: number) => void
}

export function MainMenu({ maxUnlockedLevel, onStartLevel }: MainMenuProps) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <header className="flex flex-col items-center gap-2 px-4">
        <h1
          className="text-balance text-center text-5xl font-black tracking-tight text-white md:text-7xl"
          style={{ textShadow: '3px 3px 0 #1a1a2e, -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e' }}
        >
          Арсений VS Друзья
        </h1>
        <p
          className="text-pretty text-center text-lg font-bold text-primary md:text-xl"
          style={{ textShadow: '2px 2px 0 #1a1a2e' }}
        >
          Защити свою будку и уничтожь вражескую базу!
        </p>
      </header>

      <div className="flex items-end justify-center gap-8 px-4">
        <img
          src="/assets/arseniy-ezhp.png"
          alt="Арсений из ЭЖП"
          className="h-32 w-auto drop-shadow-lg md:h-44"
        />
        <img
          src="/assets/arseniy-os.png"
          alt="Арсений из Очень Страшно"
          className="h-40 w-auto drop-shadow-lg md:h-56"
        />
        <img
          src="/assets/arseniy-fpu.png"
          alt="Арсений из Фильма про Убийцу"
          className="h-32 w-auto drop-shadow-lg md:h-44"
        />
      </div>

      <nav className="flex flex-col items-center gap-3" aria-label="Выбор уровня">
        <button
          type="button"
          onClick={() => onStartLevel(1)}
          className="rounded-xl border-4 border-border bg-primary px-12 py-4 text-3xl font-black text-primary-foreground shadow-[6px_6px_0_#1a1a2e] transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#1a1a2e]"
        >
          ИГРАТЬ
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onStartLevel(1)}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-lg font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Уровень 1
          </button>
          <button
            type="button"
            onClick={() => onStartLevel(2)}
            disabled={maxUnlockedLevel < 2}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-lg font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {maxUnlockedLevel < 2 ? 'Уровень 2 (закрыт)' : 'Уровень 2'}
          </button>
        </div>
      </nav>
    </div>
  )
}
