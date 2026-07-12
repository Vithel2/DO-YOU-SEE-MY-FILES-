'use client'

import { useEffect, useRef, useState } from 'react'
import { AD_FULL_REWARD, AD_MIN_WATCH_S } from '@/lib/game-data'

/** Where the player stopped the 3:21 ad last time — so they can finish it later */
const AD_POS_KEY = 'avd-ad-pos'

function readSavedPos(): number {
  try {
    const n = Number.parseFloat(localStorage.getItem(AD_POS_KEY) ?? '0')
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function savePos(t: number) {
  try {
    localStorage.setItem(AD_POS_KEY, String(t))
  } catch {
    // ignore
  }
}

function clearPos() {
  try {
    localStorage.removeItem(AD_POS_KEY)
  } catch {
    // ignore
  }
}

interface AdModalProps {
  /** reward for a partial watch (after AD_MIN_WATCH_S seconds) */
  partialReward: number
  /** called with the partial reward; the video position is saved for later */
  onPartial: () => void
  /** watched the whole 3:21 — big 321 reward + bonus */
  onFull: () => void
  /** closed before 10 seconds — no reward (position still saved) */
  onSkipEarly: () => void
}

export function AdModal({ partialReward, onPartial, onFull, onSkipEarly }: AdModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const startPosRef = useRef(0)
  const [ended, setEnded] = useState(false)
  const [watchedS, setWatchedS] = useState(0)
  const [resumed, setResumed] = useState(false)

  // resume from the saved position (the ad is 3:21 long!)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onMeta = () => {
      const saved = readSavedPos()
      if (saved > 1 && saved < v.duration - 2) {
        v.currentTime = saved
        startPosRef.current = saved
        setResumed(true)
      }
    }
    v.addEventListener('loadedmetadata', onMeta)
    return () => v.removeEventListener('loadedmetadata', onMeta)
  }, [])

  const canTakePartial = watchedS >= AD_MIN_WATCH_S && !ended
  const partialLeft = Math.max(0, Math.ceil(AD_MIN_WATCH_S - watchedS))

  const handlePartial = () => {
    const v = videoRef.current
    if (v) savePos(v.currentTime)
    onPartial()
  }

  const handleSkipEarly = () => {
    const v = videoRef.current
    if (v) savePos(v.currentTime)
    onSkipEarly()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Рекламный ролик"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border-4 border-border bg-card p-5 shadow-[8px_8px_0_#1a1a2e]">
        <h2 className="text-2xl font-black text-card-foreground">
          {ended ? 'ЛЕГЕНДА! Досмотрел до конца!' : 'Реклама...'}
        </h2>
        {resumed && !ended && (
          <p className="text-xs font-bold text-muted-foreground">
            Продолжаем с того места, где ты остановился
          </p>
        )}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src="/videos/reklama321.mp4"
          autoPlay
          playsInline
          onEnded={() => {
            clearPos()
            setEnded(true)
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            setWatchedS(Math.max(0, v.currentTime - startPosRef.current))
          }}
          className="w-full rounded-lg border-2 border-border"
        />
        {ended ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-balance text-center text-sm font-bold text-card-foreground">
              {`За полный просмотр: +${AD_FULL_REWARD} валюты и бесплатная таблетка!`}
            </p>
            <button
              type="button"
              onClick={onFull}
              className="rounded-xl border-4 border-border bg-primary px-10 py-3 text-xl font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              {`Забрать +${AD_FULL_REWARD}!`}
            </button>
          </div>
        ) : canTakePartial ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handlePartial}
              className="rounded-xl border-4 border-border bg-primary px-8 py-2.5 text-lg font-black text-primary-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
            >
              {`Забрать +${partialReward} и выйти`}
            </button>
            <p className="text-xs font-bold text-muted-foreground">
              {`Досмотри до конца — получишь +${AD_FULL_REWARD} и бонус! Место сохранится.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-bold text-card-foreground">
              {`Награда через ${partialLeft} сек...`}
            </p>
            <button
              type="button"
              onClick={handleSkipEarly}
              className="text-sm font-medium text-muted underline"
            >
              Закрыть без награды
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
