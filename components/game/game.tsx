'use client'

import { useCallback, useEffect, useState } from 'react'
import { getMaxUnlockedLevel, setMaxUnlockedLevel } from '@/lib/progress'
import { playMusic, playMusicFile, playSound } from '@/lib/sound'
import { AccountScreen } from './account-screen'
import { Battlefield } from './battlefield'
import { CharactersScreen } from './characters-screen'
import { EndScreen } from './end-screen'
import { FinalEnding } from './final-ending'
import { GameStage } from './game-stage'
import { LeaderboardScreen } from './leaderboard-screen'
import { LevelsScreen } from './levels-screen'
import { MainMenu } from './main-menu'
import { NewsScreen } from './news-screen'
import { SettingsScreen } from './settings-screen'
import { SoundsScreen } from './sounds-screen'

type Screen =
  | 'menu'
  | 'levels'
  | 'characters'
  | 'settings'
  | 'account'
  | 'leaders'
  | 'sounds'
  | 'news'
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

  // background music per screen; level 7 has its own song (a bit quieter)
  useEffect(() => {
    if (screen === 'playing' && level === 7) playMusicFile('level7-song', 0.18)
    else playMusic('menu-music')
  }, [screen, level])

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
      // Levels 7 (secret) and 8 (endless) never unlock the next level
      if (r === 'victory' && level < 6) {
        const next = level + 1
        setMaxLevel((m) => Math.max(m, next))
        setMaxUnlockedLevel(next)
      }
      // Beating level 6 (the boss) shows the true ending
      if (r === 'victory' && level === 6) {
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
            onSounds={() => setScreen('sounds')}
            onNews={() => setScreen('news')}
          />
        )}

        {screen === 'sounds' && <SoundsScreen onBack={() => setScreen('menu')} />}

        {screen === 'news' && <NewsScreen onBack={() => setScreen('menu')} />}

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
                hasNextLevel={level < 6}
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
