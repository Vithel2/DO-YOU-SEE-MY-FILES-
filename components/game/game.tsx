'use client'

import { useCallback, useEffect, useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { getMaxUnlockedLevel, setMaxUnlockedLevel } from '@/lib/progress'
import { playMusic, playSound } from '@/lib/sound'
import { Battlefield } from './battlefield'
import { CharactersScreen } from './characters-screen'
import { EndScreen } from './end-screen'
import { LevelsScreen } from './levels-screen'
import { MainMenu } from './main-menu'

type Screen = 'menu' | 'levels' | 'characters' | 'playing' | 'ended'

export function Game() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [level, setLevel] = useState(1)
  const [maxUnlockedLevel, setMaxLevel] = useState(1)
  const [tutorialSeen, setTutorialSeen] = useState(false)
  const [result, setResult] = useState<'victory' | 'defeat'>('victory')
  const [battleKey, setBattleKey] = useState(0)

  // restore saved progress on the device
  useEffect(() => {
    setMaxLevel(getMaxUnlockedLevel())
  }, [])

  // background music per screen
  useEffect(() => {
    if (screen === 'playing') playMusic('battle-music')
    else playMusic('menu-music')
  }, [screen])

  // click sound on every button press
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button')) playSound('click', 0.5)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const startLevel = useCallback((lvl: number) => {
    setLevel(lvl)
    setBattleKey((k) => k + 1)
    setScreen('playing')
  }, [])

  const handleResult = useCallback(
    (r: 'victory' | 'defeat') => {
      setResult(r)
      playSound(r === 'victory' ? 'victory' : 'defeat')
      if (r === 'victory' && level < LEVELS.length) {
        const next = level + 1
        setMaxLevel((m) => Math.max(m, next))
        setMaxUnlockedLevel(next)
      }
      setScreen('ended')
    },
    [level],
  )

  return (
    <main className="h-dvh w-full">
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => startLevel(1)}
          onLevels={() => setScreen('levels')}
          onCharacters={() => setScreen('characters')}
        />
      )}

      {screen === 'levels' && (
        <LevelsScreen
          maxUnlockedLevel={maxUnlockedLevel}
          onStartLevel={startLevel}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'characters' && <CharactersScreen onBack={() => setScreen('menu')} />}

      {(screen === 'playing' || screen === 'ended') && (
        <div className="relative h-full w-full">
          <Battlefield
            key={battleKey}
            level={level}
            showTutorial={!tutorialSeen && screen === 'playing'}
            onTutorialSeen={() => setTutorialSeen(true)}
            onResult={handleResult}
            onQuit={() => setScreen('menu')}
          />
          {screen === 'ended' && (
            <EndScreen
              result={result}
              level={level}
              hasNextLevel={level < LEVELS.length}
              onRetry={() => startLevel(level)}
              onNextLevel={() => startLevel(level + 1)}
              onMenu={() => setScreen('menu')}
            />
          )}
        </div>
      )}
    </main>
  )
}
