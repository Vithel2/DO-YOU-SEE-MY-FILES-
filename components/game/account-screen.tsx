'use client'

import { useState } from 'react'
import { authClient, useSession } from '@/lib/auth-client'

interface AccountScreenProps {
  onBack: () => void
}

export function AccountScreen({ onBack }: AccountScreenProps) {
  const { data: session, isPending } = useSession()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'sign-up') {
        const res = await authClient.signUp.email({ email, password, name: name.trim() || 'Игрок' })
        if (res.error) setError(res.error.message ?? 'Ошибка регистрации')
      } else {
        const res = await authClient.signIn.email({ email, password })
        if (res.error) setError(res.error.message ?? 'Неверная почта или пароль')
      }
    } catch {
      setError('Что-то пошло не так. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await authClient.signOut()
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h1 className="text-3xl font-black text-foreground [text-shadow:2px_2px_0_#fff] md:text-4xl">
        Аккаунт
      </h1>

      {isPending ? (
        <p className="rounded-lg border-2 border-border bg-card px-4 py-2 font-bold text-card-foreground">
          Загрузка...
        </p>
      ) : session?.user ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-4 border-border bg-card p-5 shadow-[4px_4px_0_#1a1a2e]">
          <img src="/assets/arseniy-card-1.png" alt="" className="h-20 w-20 rounded-xl object-cover" />
          <p className="text-center text-lg font-black text-card-foreground">{session.user.name}</p>
          <p className="text-center text-sm text-muted-foreground">{session.user.email}</p>
          <p className="text-center text-sm font-bold text-secondary">
            Прогресс и рекорды сохраняются!
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border-2 border-border bg-destructive px-5 py-2 font-bold text-destructive-foreground shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Выйти
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border-4 border-border bg-card p-5 shadow-[4px_4px_0_#1a1a2e]"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`flex-1 rounded-lg border-2 border-border px-3 py-1.5 text-sm font-black transition-colors ${
                mode === 'sign-in'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`flex-1 rounded-lg border-2 border-border px-3 py-1.5 text-sm font-black transition-colors ${
                mode === 'sign-up'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground'
              }`}
            >
              Регистрация
            </button>
          </div>

          {mode === 'sign-up' && (
            <label className="flex flex-col gap-1 text-sm font-bold text-card-foreground">
              Ник в игре
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="Арсений Победитель"
                className="rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold text-foreground outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm font-bold text-card-foreground">
            Почта
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.ru"
              className="rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-card-foreground">
            Пароль
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              className="rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold text-foreground outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p className="rounded-lg border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl border-4 border-border bg-primary px-6 py-2.5 text-lg font-black text-primary-foreground shadow-[3px_3px_0_#1a1a2e] transition-transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? 'Секунду...' : mode === 'sign-up' ? 'Создать аккаунт' : 'Войти'}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Аккаунт нужен только для сохранения рекордов в таблице лидеров
          </p>
        </form>
      )}

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
