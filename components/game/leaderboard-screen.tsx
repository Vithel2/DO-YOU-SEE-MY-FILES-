'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { getLeaderboard, type LeaderboardCategory } from '@/app/actions/stats'

interface LeaderboardScreenProps {
  onBack: () => void
}

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: string }[] = [
  { id: 'enemiesKilled', label: 'Уничтожено врагов', icon: '/assets/danil.png' },
  { id: 'currencyEarned', label: 'Собрано банок', icon: '/assets/can-ded.png' },
  { id: 'victories', label: 'Победитель', icon: '/assets/our-base.png' },
  { id: 'superArseniys', label: 'Таблеточный монстр', icon: '/assets/pill.png' },
  { id: 'wavesSurvived', label: 'Пережито волн', icon: '/assets/arseniy-os.png' },
  { id: 'shampooWins', label: 'Победы над шампунем (секретно)', icon: '/assets/shampoo.png' },
]

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [category, setCategory] = useState<LeaderboardCategory>('enemiesKilled')
  const { data, isLoading } = useSWR(['leaderboard', category], () =>
    getLeaderboard(category),
  )
  const rows = data?.rows
  const me = data?.me

  return (
    <div
      className="flex h-full w-full flex-col items-center gap-3 overflow-y-auto bg-cover bg-center px-4 py-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h1 className="text-3xl font-black text-foreground [text-shadow:2px_2px_0_#fff] md:text-4xl">
        Лидеры
      </h1>

      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-sm font-black shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-105 ${
              category === c.id ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
            }`}
          >
            <img src={c.icon || "/placeholder.svg"} alt="" className="h-5 w-5 object-contain" />
            {c.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md rounded-2xl border-4 border-border bg-card p-4 shadow-[4px_4px_0_#1a1a2e]">
        {isLoading ? (
          <p className="py-6 text-center font-bold text-muted-foreground">Загрузка...</p>
        ) : !rows || rows.length === 0 ? (
          <p className="py-6 text-center font-bold text-muted-foreground">
            Пока пусто. Стань первым — сыграй и войди в историю!
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <li
                key={`${row.name}-${i}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ${
                  row.isMe
                    ? 'border-2 border-primary bg-primary/25 shadow-[2px_2px_0_#1a1a2e]'
                    : i === 0
                      ? 'bg-primary/20'
                      : i === 1
                        ? 'bg-muted'
                        : ''
                }`}
              >
                <span className="w-7 text-lg font-black text-card-foreground">{i + 1}</span>
                <span className="flex-1 truncate font-bold text-card-foreground">
                  {row.name}
                  {row.isMe && (
                    <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground align-middle">
                      ЭТО ТЫ
                    </span>
                  )}
                </span>
                <span className="font-black text-secondary">{row.value.toLocaleString('ru-RU')}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Signed-in player is outside the top-10 — show their own row */}
        {me && (
          <div className="mt-2 border-t-2 border-dashed border-border pt-2">
            <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/25 px-3 py-1.5 shadow-[2px_2px_0_#1a1a2e]">
              <span className="w-7 text-lg font-black text-card-foreground">{me.rank}</span>
              <span className="flex-1 truncate font-bold text-card-foreground">
                {me.name}
                <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground align-middle">
                  ЭТО ТЫ
                </span>
              </span>
              <span className="font-black text-secondary">{me.value.toLocaleString('ru-RU')}</span>
            </div>
          </div>
        )}
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">
        Войди в аккаунт, чтобы твои рекорды попадали в таблицу
      </p>

      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border-2 border-border bg-card px-6 py-2 font-bold text-card-foreground shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-105"
      >
        Назад
      </button>
    </div>
  )
}
