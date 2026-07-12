'use client'

import { useEffect, useRef, useState } from 'react'
import { playFile } from '@/lib/sound'

interface MainMenuProps {
  onPlay: () => void
  onLevels: () => void
  onCharacters: () => void
  onSettings: () => void
  onAccount: () => void
  onLeaders: () => void
  onSounds: () => void
}

/** Random character voices that sometimes play on the start screen */
const MENU_VOICES = [
  'voice-super-arseniy',
  'voice-zloy-vadim',
  'voice-driggert-clone',
  'voice-arseniy-fpu',
  'voice-arseniy-ejp',
  'voice-arseniy-os',
]

/** A speech bubble shown above a character after clicking them */
function Bubble({ text }: { text: string }) {
  return (
    <span className="absolute -bottom-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-border bg-card px-2 py-0.5 text-xs font-black text-card-foreground shadow-[2px_2px_0_#1a1a2e]">
      {text}
    </span>
  )
}

export function MainMenu({
  onPlay,
  onLevels,
  onCharacters,
  onSettings,
  onAccount,
  onLeaders,
  onSounds,
}: MainMenuProps) {
  // Easter egg: click Luntik 5 times — "Я родился!"
  const luntikClicks = useRef(0)
  // which character is currently "talking" (showing their phrase)
  const [talking, setTalking] = useState<string | null>(null)
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Easter egg: click the title 10 times — the title goes "шиза" for a moment
  const titleClicks = useRef(0)
  const [titleShiza, setTitleShiza] = useState(false)

  const say = (id: string) => {
    if (talkTimer.current) clearTimeout(talkTimer.current)
    setTalking(id)
    talkTimer.current = setTimeout(() => setTalking(null), 2500)
  }

  const handleLuntikClick = () => {
    luntikClicks.current += 1
    if (luntikClicks.current >= 5) {
      luntikClicks.current = 0
      say('luntik')
    }
  }

  const handleTitleClick = () => {
    titleClicks.current += 1
    if (titleClicks.current >= 10) {
      titleClicks.current = 0
      setTitleShiza(true)
      setTimeout(() => setTitleShiza(false), 3000)
    }
  }

  // Sometimes a random character voice plays on the start screen, just for fun
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      // every 12–30 seconds
      const delay = 12000 + Math.random() * 18000
      timer = setTimeout(() => {
        if (cancelled) return
        const file = MENU_VOICES[Math.floor(Math.random() * MENU_VOICES.length)]
        playFile(file, 0.7)
        schedule()
      }, delay)
    }
    schedule()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden bg-cover bg-center md:gap-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      {/* Corner characters — click them and they answer! */}
      <button
        type="button"
        onClick={() => say('danil')}
        className="absolute bottom-2 left-1 cursor-pointer border-0 bg-transparent p-0"
        aria-label="Данил из ЭЖП"
      >
        <img
          src="/assets/danil.png"
          alt="Данил из ЭЖП"
          className="idle-bob-slow h-20 w-auto drop-shadow-lg sm:h-28 md:h-36"
          style={{ '--bob-rotate': '-6deg' } as React.CSSProperties}
        />
        {talking === 'danil' && <Bubble text="мне чё нельзя ничё...?" />}
      </button>
      <button
        type="button"
        onClick={handleLuntikClick}
        className="absolute left-2 top-2 cursor-pointer border-0 bg-transparent p-0"
        aria-label="Лунтик"
      >
        <img
          src="/assets/luntik.png"
          alt="Лунтик"
          className="idle-bob h-16 w-auto drop-shadow-lg sm:h-24 md:h-32"
          style={{ '--bob-rotate': '-12deg' } as React.CSSProperties}
        />
        {talking === 'luntik' && <Bubble text="Я родился!" />}
      </button>
      <button
        type="button"
        onClick={() => say('sasha')}
        className="absolute right-2 top-2 cursor-pointer border-0 bg-transparent p-0"
        aria-label="Саша Вачаева"
      >
        <img
          src="/assets/sasha.png"
          alt="Саша Вачаева"
          className="idle-bob idle-bob-delay h-16 w-auto drop-shadow-lg sm:h-24 md:h-32"
          style={{ '--bob-rotate': '12deg' } as React.CSSProperties}
        />
        {talking === 'sasha' && <Bubble text="ты чё офигел?" />}
      </button>
      <button
        type="button"
        onClick={() => say('driggert')}
        className="absolute bottom-2 right-1 cursor-pointer border-0 bg-transparent p-0"
        aria-label="Дриггерт Матвей"
      >
        <img
          src="/assets/driggert.png"
          alt="Дриггерт Матвей"
          className="idle-bob-slow idle-bob-delay h-24 w-auto drop-shadow-lg sm:h-32 md:h-44"
          style={{ '--bob-rotate': '6deg' } as React.CSSProperties}
        />
        {talking === 'driggert' && <Bubble text="поплачь давай!" />}
      </button>

      <header className="z-10 flex flex-col items-center gap-2 px-4">
        <h1
          className="text-balance text-center text-4xl font-black tracking-tight text-white sm:text-5xl md:text-7xl"
          style={{ textShadow: '3px 3px 0 #1a1a2e, -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e' }}
          onClick={handleTitleClick}
        >
          {titleShiza ? 'ШИЗА VS ДЕД' : 'Арсений VS Друзья'}
        </h1>
        <p
          className="text-pretty text-center text-base font-bold text-primary sm:text-lg md:text-xl"
          style={{ textShadow: '2px 2px 0 #1a1a2e' }}
        >
          Защити свою будку и уничтожь вражескую базу!
        </p>
      </header>

      <div className="z-10 flex items-end justify-center gap-4 px-4 sm:gap-8">
        <button
          type="button"
          onClick={() => {
            say('arseniy-ezhp')
            playFile('voice-arseniy-ejp', 0.8)
          }}
          className="relative cursor-pointer border-0 bg-transparent p-0"
          aria-label="Арсений из ЭЖП"
        >
          <img
            src="/assets/arseniy-ezhp.png"
            alt="Арсений из ЭЖП"
            className="idle-bob h-24 w-auto drop-shadow-lg sm:h-32 md:h-44"
          />
          {talking === 'arseniy-ezhp' && <Bubble text="Фильм про Уживитик 2 не выйдё!" />}
        </button>
        <button
          type="button"
          onClick={() => {
            say('arseniy-os')
            playFile('voice-arseniy-os', 0.8)
          }}
          className="relative cursor-pointer border-0 bg-transparent p-0"
          aria-label="Арсений из Очень Страшно"
        >
          <img
            src="/assets/arseniy-os.png"
            alt="Арсений из Очень Страшно"
            className="idle-bob-slow h-32 w-auto drop-shadow-lg sm:h-40 md:h-56"
          />
          {talking === 'arseniy-os' && <Bubble text="Оч страшно..." />}
        </button>
        <button
          type="button"
          onClick={() => {
            say('arseniy-fpu')
            playFile('voice-arseniy-fpu', 0.8)
          }}
          className="relative cursor-pointer border-0 bg-transparent p-0"
          aria-label="Арсений из Фильма про Убийцу"
        >
          <img
            src="/assets/arseniy-fpu.png"
            alt="Арсений из Фильма про Убийцу"
            className="idle-bob idle-bob-delay h-24 w-auto drop-shadow-lg sm:h-32 md:h-44"
          />
          {talking === 'arseniy-fpu' && <Bubble text="Фильм про Уживитик 2 не выйдё!" />}
        </button>
      </div>

      <nav className="z-10 flex flex-col items-center gap-3" aria-label="Главное меню">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-xl border-4 border-border bg-primary px-10 py-3.5 text-2xl font-black text-primary-foreground shadow-[6px_6px_0_#1a1a2e] transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#1a1a2e] sm:px-12 sm:py-4 sm:text-3xl"
        >
          ИГРАТЬ
        </button>
        <div className="flex flex-wrap justify-center gap-2 px-2 sm:gap-3">
          <button
            type="button"
            onClick={onLevels}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Уровни
          </button>
          <button
            type="button"
            onClick={onCharacters}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Персонажи
          </button>
          <button
            type="button"
            onClick={onLeaders}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Лидеры
          </button>
          <button
            type="button"
            onClick={onSounds}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Звуки
          </button>
          <button
            type="button"
            onClick={onAccount}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Аккаунт
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 sm:px-6 sm:text-lg"
          >
            Настройки
          </button>
        </div>
      </nav>

      <div className="pointer-events-none absolute bottom-1 right-2 z-10 flex flex-col items-end">
        <span className="text-xs font-black text-white/90" style={{ textShadow: '1px 1px 0 #1a1a2e' }}>
          Beta 1.2
        </span>
        <span className="text-[10px] font-bold text-white/70" style={{ textShadow: '1px 1px 0 #1a1a2e' }}>
          by Vithel (тт: vithel_tt)
        </span>
      </div>
    </div>
  )
}
