'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelSearch,
  createRoom,
  findMatch,
  getMyPvp,
  joinRoom,
  listPublicRooms,
  pollMatch,
  type PublicRoom,
  type PvpProfile,
} from '@/app/actions/pvp'
import { useSession } from '@/lib/auth-client'
import { playSound } from '@/lib/sound'

interface PvpLobbyProps {
  onBack: () => void
  onAccount: () => void
  /** enter the battle for this match */
  onStartMatch: (matchId: string) => void
}

/** Fun rank titles by elo */
function rankTitle(elo: number): string {
  if (elo < 900) return 'Лунтик'
  if (elo < 1100) return 'Боец'
  if (elo < 1300) return 'Гроза деревни'
  if (elo < 1500) return 'Легенда двора'
  return 'СУПЕР АРСЕНИЙ'
}

type View = 'main' | 'searching' | 'hosting' | 'rooms' | 'code'

export function PvpLobby({ onBack, onAccount, onStartMatch }: PvpLobbyProps) {
  const { data: session, isPending } = useSession()
  const [view, setView] = useState<View>('main')
  const [profile, setProfile] = useState<PvpProfile | null>(null)
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')
  const [showExit, setShowExit] = useState(false)
  const [busy, setBusy] = useState(false)

  const matchIdRef = useRef<string | null>(null)
  const stoppedRef = useRef(false)

  // load my profile
  useEffect(() => {
    if (!session?.user) return
    getMyPvp().then((p) => setProfile(p))
  }, [session?.user])

  /* --- matchmaking loop --- */
  const startSearch = useCallback(() => {
    playSound('mouseclick')
    setError('')
    setShowExit(false)
    setView('searching')
    stoppedRef.current = false

    // «Выйти» появляется через 5 секунд без соперника
    const exitTimer = setTimeout(() => setShowExit(true), 5000)

    const tick = async () => {
      if (stoppedRef.current) return
      try {
        const res = await findMatch()
        if (stoppedRef.current) {
          // раз мы вышли, а матч вдруг нашёлся — отменяем запись
          if (res.matchId && !res.started) cancelSearch(res.matchId)
          return
        }
        if (!res.ok) {
          setError(res.error ?? 'Ошибка поиска')
          setView('main')
          return
        }
        matchIdRef.current = res.matchId ?? null
        if (res.started && res.matchId) {
          clearTimeout(exitTimer)
          onStartMatch(res.matchId)
          return
        }
        // ещё ждём: если я в очереди — проверяю, не присоединился ли кто ко мне
        if (res.matchId) {
          const poll = await pollMatch(res.matchId, 0)
          if (stoppedRef.current) return
          if (poll.status === 'playing') {
            clearTimeout(exitTimer)
            onStartMatch(res.matchId)
            return
          }
        }
      } catch {
        // сеть моргнула — просто пробуем ещё раз
      }
      if (!stoppedRef.current) setTimeout(tick, 2000)
    }
    tick()
  }, [onStartMatch])

  const stopSearch = useCallback(() => {
    playSound('mouseclick')
    stoppedRef.current = true
    if (matchIdRef.current) cancelSearch(matchIdRef.current)
    matchIdRef.current = null
    setView('main')
  }, [])

  /* --- hosting loop (room waiting for a friend) --- */
  const hostRoom = useCallback(
    async (isPublic: boolean) => {
      playSound('mouseclick')
      setBusy(true)
      setError('')
      const res = await createRoom(isPublic)
      setBusy(false)
      if (!res.ok || !res.matchId) {
        setError(res.error ?? 'Ошибка')
        return
      }
      matchIdRef.current = res.matchId
      setRoomCode(res.code ?? null)
      setView('hosting')
      stoppedRef.current = false

      const tick = async () => {
        if (stoppedRef.current || !matchIdRef.current) return
        try {
          const poll = await pollMatch(matchIdRef.current, 0)
          if (stoppedRef.current) return
          if (poll.status === 'playing') {
            onStartMatch(matchIdRef.current)
            return
          }
          if (poll.status === 'gone') {
            setView('main')
            return
          }
        } catch {
          // retry
        }
        if (!stoppedRef.current) setTimeout(tick, 2000)
      }
      tick()
    },
    [onStartMatch],
  )

  const closeRoom = useCallback(() => {
    playSound('mouseclick')
    stoppedRef.current = true
    if (matchIdRef.current) cancelSearch(matchIdRef.current)
    matchIdRef.current = null
    setRoomCode(null)
    setView('main')
  }, [])

  /* --- public rooms list --- */
  useEffect(() => {
    if (view !== 'rooms') return
    let alive = true
    const load = async () => {
      try {
        const list = await listPublicRooms()
        if (alive) setRooms(list)
      } catch {
        // ignore
      }
      if (alive) timer = setTimeout(load, 3000)
    }
    let timer: ReturnType<typeof setTimeout>
    load()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [view])

  const enterRoom = useCallback(
    async (code: string) => {
      playSound('mouseclick')
      setBusy(true)
      setError('')
      const res = await joinRoom(code)
      setBusy(false)
      if (!res.ok || !res.matchId) {
        setError(res.error ?? 'Не удалось войти')
        return
      }
      onStartMatch(res.matchId)
    },
    [onStartMatch],
  )

  // cleanup when leaving the lobby entirely
  useEffect(() => {
    return () => {
      stoppedRef.current = true
      if (matchIdRef.current) cancelSearch(matchIdRef.current)
    }
  }, [])

  /* --- not signed in --- */
  if (!isPending && !session?.user) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-5 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      >
        <h2 className="text-5xl font-black text-white" style={{ textShadow: '3px 3px 0 #1a1a2e' }}>
          Сражения
        </h2>
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border-4 border-border bg-card px-8 py-6 shadow-[4px_4px_0_#1a1a2e]">
          <p className="text-center text-lg font-bold text-card-foreground">
            Для PvP нужен аккаунт — эло и история матчей привязаны к нему!
          </p>
          <button
            type="button"
            onClick={onAccount}
            className="rounded-xl border-4 border-border bg-primary px-8 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Войти в аккаунт
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border-4 border-border bg-card px-8 py-3 text-xl font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
        >
          Назад
        </button>
      </div>
    )
  }

  /* --- searching overlay --- */
  if (view === 'searching') {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      >
        <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-border bg-card px-10 py-8 shadow-[4px_4px_0_#1a1a2e]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-2xl font-black text-card-foreground">Ищем соперника...</p>
          <p className="text-sm font-bold text-muted-foreground">
            Подбираем игрока с похожим эло ({profile ? profile.elo : '...'})
          </p>
          {showExit && (
            <button
              type="button"
              onClick={stopSearch}
              className="rounded-xl border-4 border-border bg-destructive px-8 py-2 text-lg font-black text-destructive-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              Выйти
            </button>
          )}
        </div>
      </div>
    )
  }

  /* --- hosting a room --- */
  if (view === 'hosting') {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      >
        <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-border bg-card px-10 py-8 shadow-[4px_4px_0_#1a1a2e]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-2xl font-black text-card-foreground">Ждём соперника...</p>
          {roomCode && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-bold text-muted-foreground">Код комнаты для друга:</p>
              <p className="text-5xl font-black tracking-widest text-primary">{roomCode}</p>
            </div>
          )}
          <button
            type="button"
            onClick={closeRoom}
            className="rounded-xl border-4 border-border bg-destructive px-8 py-2 text-lg font-black text-destructive-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Закрыть комнату
          </button>
        </div>
      </div>
    )
  }

  /* --- public rooms list --- */
  if (view === 'rooms') {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center gap-5 overflow-y-auto bg-cover bg-center py-6"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      >
        <h2 className="text-4xl font-black text-white" style={{ textShadow: '3px 3px 0 #1a1a2e' }}>
          Публичные комнаты
        </h2>
        <div className="flex w-full max-w-lg flex-col gap-3 px-6">
          {rooms.length === 0 && (
            <div className="rounded-xl border-4 border-border bg-card px-6 py-5 text-center shadow-[4px_4px_0_#1a1a2e]">
              <p className="text-lg font-bold text-muted-foreground">
                Пока нет открытых комнат... Создай свою!
              </p>
            </div>
          )}
          {rooms.map((r) => (
            <div
              key={r.code}
              className="flex items-center justify-between gap-3 rounded-xl border-4 border-border bg-card px-5 py-3 shadow-[4px_4px_0_#1a1a2e]"
            >
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-card-foreground">{r.hostName}</p>
                <p className="text-sm font-bold text-muted-foreground">
                  Эло: {r.hostElo} · {rankTitle(r.hostElo)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => enterRoom(r.code)}
                className="shrink-0 rounded-lg border-2 border-border bg-primary px-5 py-2 font-black text-primary-foreground shadow-[2px_2px_0_#1a1a2e] transition-transform hover:scale-105 disabled:opacity-50"
              >
                Войти
              </button>
            </div>
          ))}
        </div>
        {error && <p className="font-bold text-destructive">{error}</p>}
        <button
          type="button"
          onClick={() => {
            playSound('mouseclick')
            setView('main')
          }}
          className="rounded-xl border-4 border-border bg-card px-8 py-3 text-xl font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
        >
          Назад
        </button>
      </div>
    )
  }

  /* --- join by code --- */
  if (view === 'code') {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-5 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/background.png')" }}
      >
        <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-border bg-card px-10 py-8 shadow-[4px_4px_0_#1a1a2e]">
          <p className="text-2xl font-black text-card-foreground">Введи код комнаты</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                enterRoom(codeInput)
              }
            }}
            placeholder="0000"
            className="w-40 rounded-lg border-2 border-border bg-background px-4 py-2 text-center text-3xl font-black tracking-widest text-foreground"
            aria-label="Код комнаты"
          />
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy || codeInput.length < 4}
              onClick={() => enterRoom(codeInput)}
              className="rounded-xl border-4 border-border bg-primary px-8 py-2 text-lg font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105 disabled:opacity-50"
            >
              Войти
            </button>
            <button
              type="button"
              onClick={() => {
                playSound('mouseclick')
                setError('')
                setView('main')
              }}
              className="rounded-xl border-4 border-border bg-card px-8 py-2 text-lg font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- main lobby --- */
  return (
    <div
      className="relative flex h-full w-full flex-col items-center gap-4 overflow-y-auto bg-cover bg-center py-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h2 className="text-5xl font-black text-white" style={{ textShadow: '3px 3px 0 #1a1a2e' }}>
        Сражения
      </h2>

      {/* my rating card */}
      <div className="flex w-full max-w-lg flex-col gap-2 rounded-xl border-4 border-primary bg-card px-6 py-4 shadow-[4px_4px_0_#1a1a2e]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-card-foreground">
              {session?.user?.name ?? 'Игрок'}
            </p>
            <p className="text-sm font-bold text-muted-foreground">
              {profile ? rankTitle(profile.elo) : '...'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary">{profile ? profile.elo : '...'}</p>
            <p className="text-xs font-bold text-muted-foreground">ЭЛО</p>
          </div>
        </div>
        {profile && (
          <p className="text-sm font-bold text-muted-foreground">
            Побед: <span className="text-primary">{profile.wins}</span> · Поражений:{' '}
            <span className="text-destructive">{profile.losses}</span>
          </p>
        )}
      </div>

      {/* actions */}
      <div className="flex w-full max-w-lg flex-col gap-3 px-6">
        <button
          type="button"
          onClick={startSearch}
          className="rounded-xl border-4 border-border bg-primary px-8 py-4 text-2xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
        >
          Найти соперника
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => hostRoom(false)}
            className="flex-1 rounded-xl border-4 border-border bg-card px-4 py-3 text-lg font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105 disabled:opacity-50"
          >
            Комната для друга
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => hostRoom(true)}
            className="flex-1 rounded-xl border-4 border-border bg-card px-4 py-3 text-lg font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105 disabled:opacity-50"
          >
            Публичная комната
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              playSound('mouseclick')
              setError('')
              setView('code')
            }}
            className="flex-1 rounded-xl border-4 border-border bg-card px-4 py-3 text-lg font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Ввести код
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('mouseclick')
              setError('')
              setView('rooms')
            }}
            className="flex-1 rounded-xl border-4 border-border bg-card px-4 py-3 text-lg font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
          >
            Найти комнаты
          </button>
        </div>
        {error && <p className="text-center font-bold text-destructive">{error}</p>}
      </div>

      {/* match history */}
      <div className="flex w-full max-w-lg flex-col gap-2 px-6">
        <h3 className="text-xl font-black text-white" style={{ textShadow: '2px 2px 0 #1a1a2e' }}>
          История матчей
        </h3>
        {(!profile || profile.history.length === 0) && (
          <div className="rounded-xl border-4 border-border bg-card px-5 py-4 shadow-[4px_4px_0_#1a1a2e]">
            <p className="text-center text-sm font-bold text-muted-foreground">
              Пока нет матчей — найди соперника!
            </p>
          </div>
        )}
        {profile?.history.map((h, i) => (
          <div
            key={`${h.date}-${i}`}
            className={`flex items-center justify-between rounded-xl border-4 bg-card px-4 py-2 shadow-[4px_4px_0_#1a1a2e] ${
              h.won ? 'border-primary' : 'border-destructive'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-card-foreground">vs {h.opponent}</p>
              <p className="text-xs font-bold text-muted-foreground">
                {new Date(h.date).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`text-sm font-black ${h.won ? 'text-primary' : 'text-destructive'}`}
              >
                {h.won ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
              </span>
              <span
                className={`rounded border-2 px-1.5 py-0.5 text-xs font-black ${
                  h.eloDelta >= 0
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-destructive bg-destructive/15 text-destructive'
                }`}
              >
                {h.eloDelta >= 0 ? `+${h.eloDelta}` : h.eloDelta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border-4 border-border bg-card px-8 py-3 text-xl font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
      >
        Назад
      </button>
    </div>
  )
}
