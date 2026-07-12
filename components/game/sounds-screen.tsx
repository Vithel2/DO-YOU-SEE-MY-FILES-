'use client'

import { useEffect, useRef, useState } from 'react'
import { getMusicTrack, MUSIC_TRACKS, setMusicTrack } from '@/lib/sound'

interface SoundsScreenProps {
  onBack: () => void
}

interface SoundEntry {
  file: string
  name: string
  description: string
}

/** Every sound used in the game, with a human description */
const SOUNDS: SoundEntry[] = [
  { file: 'music', name: 'MusicForGame', description: 'Классическая музыка игры (выбирается в настройках).' },
  { file: 'music-beta-menu', name: '02. Beta Main Menu', description: 'Второй трек для игры (выбирается в настройках).' },
  { file: 'music-subwoofer', name: 'Subwoofer Lullaby', description: 'Третий трек для игры (выбирается в настройках).' },
  { file: 'level7-song', name: 'Песня «6-7»', description: 'Gazan — 6-7. Играет только на уровне 7.' },
  { file: 'mouseclick', name: 'Клик', description: 'Нажатие кнопок и подбор банок.' },
  { file: 'buy-arseniy', name: 'Призыв Арсения', description: 'Звучит при покупке любого Арсения.' },
  { file: 'death1', name: 'Смерть 1', description: 'Первый вариант звука смерти бойца.' },
  { file: 'death2', name: 'Смерть 2', description: 'Второй вариант звука смерти бойца.' },
  { file: 'win', name: 'Победа', description: 'Звучит при победе на уровне.' },
  { file: 'base-explosion', name: 'Взрыв базы', description: 'Взрыв базы на всех уровнях (кроме 6-го).' },
  { file: 'boss-voice', name: 'Голос ЗлогоКлонаАрсения', description: 'Голос босса на 6 уровне.' },
  { file: 'vadim-car', name: 'Тачка Вадима', description: 'Звук тачки ЗлогоВадима на 6 уровне.' },
  { file: 'voice-zloy-vadim', name: 'Голос ЗлогоВадима', description: 'Голос ЗлогоВадимаНаТачке.' },
  { file: 'radiation', name: 'Радиация', description: 'Звук радиации после ядерки на 6 уровне.' },
  { file: 'nuke', name: 'Ядерка', description: 'Ядерный удар босса на 6 уровне.' },
  {
    file: 'voice-driggert-clone',
    name: 'Голос клона Дриггерта',
    description: 'Болтовня маленького злого клона Дриггерта (6 уровень).',
  },
  {
    file: 'voice-super-arseniy',
    name: 'Голос СуперАрсения',
    description: 'СуперАрсений говорит, что он СуперАрсений.',
  },
  { file: 'voice-arseniy-fpu', name: 'Голос Арсения (ФПУ)', description: 'Голос Арсения из Фильма про Убийцу.' },
  { file: 'voice-arseniy-ejp', name: 'Голос Арсения (ЭЖП)', description: 'Голос Арсения из ЭЖП.' },
  { file: 'voice-arseniy-os', name: 'Голос Арсения (ОС)', description: 'Голос Арсения из Очень Страшно.' },
]

export function SoundsScreen({ onBack }: SoundsScreenProps) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [track, setTrack] = useState(() => getMusicTrack())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isMusicTrack = (file: string) => MUSIC_TRACKS.some((t) => t.file === file)

  const toggle = (file: string) => {
    // stop the current one
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playing === file) {
      setPlaying(null)
      return
    }
    const audio = new Audio(`/sounds/${file}.mp3`)
    audio.volume = 0.8
    audio.addEventListener('ended', () => setPlaying(null))
    audio.addEventListener('error', () => setPlaying(null))
    audioRef.current = audio
    audio.play().catch(() => setPlaying(null))
    setPlaying(file)
  }

  // stop playback when leaving the screen
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div
      className="flex h-full w-full flex-col items-center gap-4 overflow-y-auto bg-cover bg-center p-4 md:p-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <header className="flex w-full max-w-2xl items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-bold text-card-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105"
        >
          Назад
        </button>
        <h2
          className="text-2xl font-black text-white md:text-3xl"
          style={{ textShadow: '2px 2px 0 #1a1a2e' }}
        >
          Звуки игры
        </h2>
        <div className="w-16" aria-hidden="true" />
      </header>

      <p
        className="max-w-2xl text-pretty text-center text-sm font-bold text-white/90"
        style={{ textShadow: '1px 1px 0 #1a1a2e' }}
      >
        Все звуки и голоса, которые используются в игре. Жми и слушай!
      </p>

      <ul className="flex w-full max-w-2xl flex-col gap-2 pb-4">
        {SOUNDS.map((s) => (
          <li
            key={s.file}
            className="flex items-center gap-3 rounded-xl border-2 border-border bg-card p-3 shadow-[3px_3px_0_#1a1a2e]"
          >
            <button
              type="button"
              onClick={() => toggle(s.file)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-border text-lg font-black shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-110 ${
                playing === s.file
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
              aria-label={playing === s.file ? `Остановить: ${s.name}` : `Прослушать: ${s.name}`}
            >
              {playing === s.file ? '■' : '▶'}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-card-foreground md:text-base">{s.name}</p>
              <p className="text-xs text-muted-foreground md:text-sm">{s.description}</p>
            </div>
            {isMusicTrack(s.file) && (
              <button
                type="button"
                onClick={() => {
                  setTrack(s.file)
                  setMusicTrack(s.file)
                }}
                className={`shrink-0 rounded-lg border-2 px-2.5 py-1.5 text-xs font-black transition-transform hover:scale-105 ${
                  track === s.file
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {track === s.file ? 'Играет' : 'Выбрать'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
