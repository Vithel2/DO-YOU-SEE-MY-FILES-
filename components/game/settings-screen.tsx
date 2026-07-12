'use client'

import { useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { tryApplyCode } from '@/lib/progress'
import {
  getMusicTrack,
  getMusicVolume,
  isMusicMuted,
  isSfxMuted,
  MUSIC_TRACKS,
  setMusicMuted,
  setMusicTrack,
  setMusicVolume,
  setSfxMuted,
} from '@/lib/sound'

interface SettingsScreenProps {
  onBack: () => void
  onCodeApplied: () => void
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]">
      <span className="text-lg font-black text-card-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-16 shrink-0 rounded-full border-2 border-border transition-colors ${
          checked ? 'bg-secondary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full border-2 border-border bg-card transition-all ${
            checked ? 'left-8' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function SettingsScreen({ onBack, onCodeApplied }: SettingsScreenProps) {
  const [musicOn, setMusicOn] = useState(() => !isMusicMuted())
  const [sfxOn, setSfxOn] = useState(() => !isSfxMuted())
  const [musicVol, setMusicVol] = useState(() => Math.round(getMusicVolume() * 100))
  const [code, setCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [track, setTrack] = useState(() => getMusicTrack())
  const [cardCopied, setCardCopied] = useState(false)

  const copyCard = () => {
    navigator.clipboard
      ?.writeText('4279 3806 8503 3450')
      .then(() => {
        setCardCopied(true)
        setTimeout(() => setCardCopied(false), 2000)
      })
      .catch(() => {})
  }

  const applyCode = () => {
    if (!code.trim()) return
    if (tryApplyCode(code, LEVELS.length)) {
      setCodeStatus('ok')
      onCodeApplied()
    } else {
      setCodeStatus('bad')
    }
    setCode('')
  }

  return (
    <div
      className="relative flex h-full w-full flex-col items-center gap-5 overflow-y-auto bg-cover bg-center py-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h2
        className="text-5xl font-black text-white"
        style={{ textShadow: '3px 3px 0 #1a1a2e' }}
      >
        Настройки
      </h2>

      <div className="flex w-full max-w-md flex-col gap-3 px-6">
        <Toggle
          label="Музыка"
          checked={musicOn}
          onChange={(v) => {
            setMusicOn(v)
            setMusicMuted(!v)
          }}
        />
        {/* Separate music volume slider */}
        <div className="flex flex-col gap-2 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]">
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-card-foreground">Громкость музыки</span>
            <span className="text-lg font-black text-secondary">{musicVol}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={musicVol}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMusicVol(v)
              setMusicVolume(v / 100)
            }}
            className="h-3 w-full cursor-pointer accent-primary"
            aria-label="Громкость музыки"
          />
        </div>

        {/* Music track picker */}
        <div className="flex flex-col gap-2 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]">
          <span className="text-lg font-black text-card-foreground">Музыка в игре</span>
          <div className="flex flex-col gap-1.5">
            {MUSIC_TRACKS.map((t) => (
              <button
                key={t.file}
                type="button"
                onClick={() => {
                  setTrack(t.file)
                  setMusicTrack(t.file)
                }}
                className={`flex items-center justify-between rounded-lg border-2 px-3 py-1.5 text-left text-sm font-bold transition-transform hover:scale-[1.02] ${
                  track === t.file
                    ? 'border-primary bg-primary/15 text-card-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <span>{t.name}</span>
                {track === t.file && <span className="text-xs font-black text-primary">Играет</span>}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          label="Звуки"
          checked={sfxOn}
          onChange={(v) => {
            setSfxOn(v)
            setSfxMuted(!v)
          }}
        />

        {/* Code entry */}
        <div className="flex flex-col gap-2 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]">
          <span className="text-lg font-black text-card-foreground">Ввести код</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setCodeStatus('idle')
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  applyCode()
                }
              }}
              placeholder="Секретный код..."
              className="min-w-0 flex-1 rounded-lg border-2 border-border bg-background px-3 py-2 font-bold text-foreground placeholder:text-muted-foreground"
              aria-label="Секретный код"
            />
            <button
              type="button"
              onClick={applyCode}
              className="rounded-lg border-2 border-border bg-primary px-4 py-2 font-black text-primary-foreground shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              ОК
            </button>
          </div>
          {codeStatus === 'ok' && (
            <span className="text-sm font-bold text-secondary" role="status">
              Код принят!
            </span>
          )}
          {codeStatus === 'bad' && (
            <span className="text-sm font-bold text-destructive" role="status">
              Неверный код
            </span>
          )}
        </div>

        {/* Support the author */}
        <div className="flex flex-col gap-2 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]">
          <span className="text-lg font-black text-card-foreground">Поддержать автора</span>
          <p className="text-sm font-bold leading-relaxed text-muted-foreground">
            Понравилась игра? Можно закинуть денег автору на карту:
          </p>
          <button
            type="button"
            onClick={copyCard}
            className="flex items-center justify-between rounded-lg border-2 border-border bg-background px-3 py-2 font-mono text-sm font-bold text-foreground transition-transform hover:scale-[1.02]"
            aria-label="Скопировать номер карты"
          >
            <span>4279 3806 8503 3450</span>
            <span className="text-xs font-black text-primary">
              {cardCopied ? 'Скопировано!' : 'Копировать'}
            </span>
          </button>
          <span className="text-xs font-bold text-muted-foreground">Виталий Ш.</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border-4 border-border bg-card px-8 py-3 text-xl font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
      >
        Назад
      </button>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-bold text-white" style={{ textShadow: '1px 1px 0 #1a1a2e' }}>
          Игра создана Vithel (тт: vithel_tt)
        </span>
        <span className="text-xs font-bold text-white/80" style={{ textShadow: '1px 1px 0 #1a1a2e' }}>
          Beta 1.3
        </span>
      </div>
    </div>
  )
}
