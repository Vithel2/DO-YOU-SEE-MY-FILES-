'use client'

import { useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { tryApplyCode } from '@/lib/progress'
import {
  getMusicVolume,
  isMusicMuted,
  isSfxMuted,
  setMusicMuted,
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
  const [codeStatus, setCodeStatus] = useState<'idle' | 'ok' | 'bad' | 'luntik'>('idle')

  const applyCode = () => {
    if (!code.trim()) return
    // маленькая пасхалка
    if (code.trim().toUpperCase() === 'ЛУНТИК') {
      setCodeStatus('luntik')
      setCode('')
      return
    }
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
      className="relative flex h-full w-full flex-col items-center justify-center gap-5 bg-cover bg-center"
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
          {codeStatus === 'luntik' && (
            <span className="text-sm font-bold text-secondary" role="status">
              Я родился!
            </span>
          )}
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
          Beta 1.0
        </span>
      </div>
    </div>
  )
}
