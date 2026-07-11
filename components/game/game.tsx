'use client'

import { useCallback, useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { Battlefield } from './battlefield'
import { EndScreen } from './end-screen'
import { MainMenu } from './main-menu'

type Screen = 'menu' | 'playing' | 'ended'

export function Game() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [level, setLevel] = useState(1)
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1)
  const [tutorialSeen, setTutorialSeen] = useState(false)
  const [result, setResult] = useState<'victory' | 'defeat'>('victory')
  const [battleKey, setBattleKey] = useState(0)

  const startLevel = useCallback((lvl: number) => {
    setLevel(lvl)
    setBattleKey((k) => k + 1)
    setScreen('playing')
  }, [])

  const handleResult = useCallback(
    (r: 'victory' | 'defeat') => {
      setResult(r)
      if (r === 'victory' && level < LEVELS.length) {
        setMaxUnlockedLevel((m) => Math.max(m, level + 1))
      }
      setScreen('ended')
    },
    [level],
  )

  return (
    <main className="h-dvh w-full">
      {screen === 'menu' && (
        <MainMenu maxUnlockedLevel={maxUnlockedLevel} onStartLevel={startLevel} />
      )}

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
