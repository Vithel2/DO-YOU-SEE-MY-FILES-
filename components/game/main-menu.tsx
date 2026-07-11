'use client'

interface MainMenuProps {
  onPlay: () => void
  onLevels: () => void
  onCharacters: () => void
  onSettings: () => void
}

export function MainMenu({ onPlay, onLevels, onCharacters, onSettings }: MainMenuProps) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden bg-cover bg-center md:gap-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      {/* Enemy decorations — corners */}
      <img
        src="/assets/danil.png"
        alt="Данил из ЭЖП"
        className="absolute bottom-2 left-1 h-20 w-auto -rotate-6 drop-shadow-lg sm:h-28 md:h-36"
      />
      <img
        src="/assets/luntik.png"
        alt="Лунтик"
        className="absolute left-2 top-2 h-16 w-auto -rotate-12 drop-shadow-lg sm:h-24 md:h-32"
      />
      <img
        src="/assets/sasha.png"
        alt="Саша Вачаева"
        className="absolute right-2 top-2 h-16 w-auto rotate-12 drop-shadow-lg sm:h-24 md:h-32"
      />
      <img
        src="/assets/driggert.png"
        alt="Дриггерт Матвей"
        className="absolute bottom-2 right-1 h-24 w-auto rotate-6 drop-shadow-lg sm:h-32 md:h-44"
      />

      <header className="z-10 flex flex-col items-center gap-2 px-4">
        <h1
          className="text-balance text-center text-4xl font-black tracking-tight text-white sm:text-5xl md:text-7xl"
          style={{ textShadow: '3px 3px 0 #1a1a2e, -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e' }}
        >
          Арсений VS Друзья
        </h1>
        <p
          className="text-pretty text-center text-base font-bold text-primary sm:text-lg md:text-xl"
          style={{ textShadow: '2px 2px 0 #1a1a2e' }}
        >
          Защити свою будку и уничтожь вражескую базу!
        </p>
      </header>

      <div className="z-10 flex items-end justify-center gap-4 px-4 sm:gap-8">
        <img
          src="/assets/arseniy-ezhp.png"
          alt="Арсений из ЭЖП"
          className="h-24 w-auto drop-shadow-lg sm:h-32 md:h-44"
        />
        <img
          src="/assets/arseniy-os.png"
          alt="Арсений из Очень Страшно"
          className="h-32 w-auto drop-shadow-lg sm:h-40 md:h-56"
        />
        <img
          src="/assets/arseniy-fpu.png"
          alt="Арсений из Фильма про Убийцу"
          className="h-24 w-auto drop-shadow-lg sm:h-32 md:h-44"
        />
      </div>

      <nav className="z-10 flex flex-col items-center gap-3" aria-label="Главное меню">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-xl border-4 border-border bg-primary px-10 py-3.5 text-2xl font-black text-primary-foreground shadow-[6px_6px_0_#1a1a2e] transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#1a1a2e] sm:px-12 sm:py-4 sm:text-3xl"
        >
          ИГРАТЬ
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onLevels}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-base font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:text-lg"
          >
            Уровни
          </button>
          <button
            type="button"
            onClick={onCharacters}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-base font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:text-lg"
          >
            Персонажи
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="rounded-lg border-2 border-border bg-card px-6 py-2 text-base font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:text-lg"
          >
            Настройки
          </button>
        </div>
      </nav>
    </div>
  )
}
