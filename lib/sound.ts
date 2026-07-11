'use client'

/**
 * Simple sound manager for the game.
 * Sound/music files live in /public/sounds/.
 * Missing files fail silently so the game never breaks without them.
 *
 * Expected files (drop them into public/sounds/):
 *   menu-music.mp3    — музыка в главном меню
 *   battle-music.mp3  — музыка во время боя
 *   can-collect.mp3   — подбор банки
 *   spawn.mp3         — призыв Арсения
 *   super-spawn.mp3   — призыв СУПЕР Арсения (таблетка)
 *   hit.mp3           — удар в бою
 *   explosion.mp3     — взрыв базы
 *   victory.mp3       — победа
 *   defeat.mp3        — поражение
 */

export type SoundName =
  | 'can-collect'
  | 'spawn'
  | 'super-spawn'
  | 'hit'
  | 'explosion'
  | 'victory'
  | 'defeat'

export type MusicName = 'menu-music' | 'battle-music'

const knownMissing = new Set<string>()
let currentMusic: HTMLAudioElement | null = null
let currentMusicName: MusicName | null = null
let muted = false

function makeAudio(name: string): HTMLAudioElement | null {
  if (typeof window === 'undefined' || knownMissing.has(name)) return null
  const audio = new Audio(`/sounds/${name}.mp3`)
  audio.addEventListener('error', () => knownMissing.add(name), { once: true })
  return audio
}

/** Play a one-shot sound effect. Safe to call even if the file is missing. */
export function playSound(name: SoundName, volume = 0.7) {
  if (muted) return
  const audio = makeAudio(name)
  if (!audio) return
  audio.volume = volume
  audio.play().catch(() => knownMissing.add(name))
}

/** Start looping music. Switching to the same track is a no-op. */
export function playMusic(name: MusicName, volume = 0.35) {
  if (typeof window === 'undefined') return
  if (currentMusicName === name && currentMusic && !currentMusic.paused) return
  stopMusic()
  if (muted) {
    currentMusicName = name
    return
  }
  const audio = makeAudio(name)
  if (!audio) return
  audio.loop = true
  audio.volume = volume
  currentMusic = audio
  currentMusicName = name
  audio.play().catch(() => {
    // Autoplay may be blocked until the first user interaction — retry once on it
    const retry = () => {
      audio.play().catch(() => knownMissing.add(name))
      window.removeEventListener('pointerdown', retry)
    }
    window.addEventListener('pointerdown', retry, { once: true })
  })
}

export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause()
    currentMusic.currentTime = 0
  }
  currentMusic = null
  currentMusicName = null
}

export function setMuted(value: boolean) {
  muted = value
  if (muted && currentMusic) {
    const name = currentMusicName
    stopMusic()
    currentMusicName = name
  } else if (!muted && currentMusicName) {
    const name = currentMusicName
    currentMusicName = null
    playMusic(name)
  }
}

export function isMuted() {
  return muted
}
