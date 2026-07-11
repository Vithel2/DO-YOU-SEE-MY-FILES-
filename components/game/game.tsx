'use client'

import { useCallback, useEffect, useState } from 'react'
import { LEVELS } from '@/lib/game-data'
import { getMaxUnlockedLevel, setMaxUnlockedLevel } from '@/lib/progress'
import { playMusic, playSound } from '@/lib/sound'
import { AccountScreen } from './account-screen'
import { Battlefield } from './battlefield'
import { CharactersScreen } from './characters-screen'
import { EndScreen } from './end-screen'
import { FinalEnding } from './final-ending'
import { GameStage } from './game-stage'
import { LeaderboardScreen } from './leaderboard-screen'
import { LevelsScreen } from './levels-screen'
import { MainMenu } from './main-menu'
import { SettingsScreen } from './settings-screen'

type Screen =
  | 'menu'
  | 'levels'
  | 'characters'
  | 'settings'
  | 'account'
  | 'leaders'
  | 'playing'
  | 'ended'
  | 'finale'

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
      // Beating the last level shows the true ending
      if (r === 'victory' && level === LEVELS.length) {
        setScreen('finale')
      } else {
        setScreen('ended')
      }
    },
    [level],
  )

  return (
    <main>
      <GameStage>
        {screen === 'menu' && (
          <MainMenu
            onPlay={() => startLevel(1)}
            onLevels={() => setScreen('levels')}
            onCharacters={() => setScreen('characters')}
            onSettings={() => setScreen('settings')}
            onAccount={() => setScreen('account')}
            onLeaders={() => setScreen('leaders')}
          />
        )}

        {screen === 'account' && <AccountScreen onBack={() => setScreen('menu')} />}

        {screen === 'leaders' && <LeaderboardScreen onBack={() => setScreen('menu')} />}

        {screen === 'levels' && (
          <LevelsScreen
            maxUnlockedLevel={maxUnlockedLevel}
            onStartLevel={startLevel}
            onBack={() => setScreen('menu')}
          />
        )}

        {screen === 'characters' && <CharactersScreen onBack={() => setScreen('menu')} />}

        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => setScreen('menu')}
            onCodeApplied={() => setMaxLevel(getMaxUnlockedLevel())}
          />
        )}

        {(screen === 'playing' || screen === 'ended' || screen === 'finale') && (
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
            {screen === 'finale' && <FinalEnding onMenu={() => setScreen('menu')} />}
          </div>
        )}
      </GameStage>
    </main>
  )
}
