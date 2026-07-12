'use client'

import { useEffect, useState } from 'react'

/**
 * Fixed-size game stage (1280x720) that scales to fit any screen.
 * This keeps the game looking identical on desktop and phones —
 * on a phone in landscape the whole game simply shrinks to fit.
 * In portrait on small screens we ask the player to rotate the phone.
 */

export const STAGE_W = 1280
export const STAGE_H = 720

interface StageState {
  scale: number
  viewportW: number
  viewportH: number
  portrait: boolean
}

export function GameStage({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<StageState | null>(null)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setStage({
        scale: Math.min(w / STAGE_W, h / STAGE_H),
        viewportW: w,
        viewportH: h,
        portrait: h > w && w < 700,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  // Avoid a flash of unscaled content before the first measurement
  if (!stage) {
    return <div className="h-dvh w-full bg-background" />
  }

  if (stage.portrait) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-8 text-center">
        <div className="rotate-90 text-6xl" aria-hidden="true">
          &#128241;
        </div>
        <p className="text-2xl font-black text-white" style={{ textShadow: '2px 2px 0 #1a1a2e' }}>
          Поверни телефон горизонтально!
        </p>
        <p className="text-base font-bold text-white/80">
          Так играть намного удобнее
        </p>
      </div>
    )
  }

  // Classic look: uniform scale with dark side bars, like Beta 1.1.
  // Characters keep their exact proportions on every screen.
  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-[#1a1a2e]">
      <div
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${stage.scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
