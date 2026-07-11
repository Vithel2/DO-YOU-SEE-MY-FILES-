'use client'

/**
 * Simple sound manager for the game.
 * Sound/music files live in /public/sounds/:
 *   music.mp3       — MusicForGame, музыка везде (меню и бой)
 *   mouseclick.mp3  — клик по кнопкам и подбор банки
 *   buy-arseniy.mp3 — покупка/призыв Арсения (и супер-версии)
 *   death1.mp3      — смерть бойца (вариант 1)
 *   death2.mp3      — смерть бойца (вариант 2)
 *   win.mp3         — победа на уровне
 * Missing files fail silently so the game never breaks without them.
 */

const SOUND_FILES = {
  click: 'mouseclick',
  'can-collect': 'mouseclick',
  spawn: 'buy-arseniy',
  'super-spawn': 'buy-arseniy',
  death1: 'death1',
  death2: 'death2',
  explosion: 'death2',
  victory: 'win',
  defeat: 'death1',
} as const

export type SoundName = keyof typeof SOUND_FILES

export type MusicName = 'menu-music' | 'battle-music'

const MUSIC_KEY = 'avd-music-off'
const SFX_KEY = 'avd-sfx-off'

const knownMissing = new Set<string>()
let currentMusic: HTMLAudioElement | null = null
let musicStarted = false

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

let musicMuted = readFlag(MUSIC_KEY)
let sfxMuted = readFlag(SFX_KEY)

function makeAudio(file: string): HTMLAudioElement | null {
  if (typeof window === 'undefined' || knownMissing.has(file)) return null
  const audio = new Audio(`/sounds/${file}.mp3`)
  audio.addEventListener('error', () => knownMissing.add(file), { once: true })
  return audio
}

/** Play a one-shot sound effect. Safe to call even if the file is missing. */
export function playSound(name: SoundName, volume = 0.7) {
  if (sfxMuted) return
  const file = SOUND_FILES[name]
  const audio = makeAudio(file)
  if (!audio) return
  audio.volume = volume
  audio.play().catch(() => {})
}

/** Play a random death sound. */
export function playDeathSound(volume = 0.7) {
  playSound(Math.random() < 0.5 ? 'death1' : 'death2', volume)
}

/**
 * Play a one-shot sound by raw file name (without .mp3), e.g. playFile('nuke').
 * Used for level 6 boss event sounds.
 */
export function playFile(file: string, volume = 0.8) {
  if (sfxMuted) return
  const audio = makeAudio(file)
  if (!audio) return
  audio.volume = volume
  audio.play().catch(() => {})
}

/**
 * Create a looping sound by raw file name (boss voice, car engine, radiation).
 * Respects the SFX mute setting. Call stop() on cleanup!
 */
export function createLoop(file: string, volume = 0.6) {
  let audio: HTMLAudioElement | null = null
  return {
    start() {
      if (sfxMuted || typeof window === 'undefined') return
      if (!audio) {
        audio = makeAudio(file)
        if (!audio) return
        audio.loop = true
        audio.volume = volume
      }
      audio.play().catch(() => {})
    },
    stop() {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    },
  }
}

/**
 * Start the looping game music (one track for the whole game).
 * The MusicName argument is kept for compatibility — both map to music.mp3.
 */
export function playMusic(_name?: MusicName, volume = 0.3) {
  if (typeof window === 'undefined' || musicMuted) return
  if (musicStarted && currentMusic && !currentMusic.paused) return
  const audio = currentMusic ?? makeAudio('music')
  if (!audio) return
  audio.loop = true
  audio.volume = volume
  currentMusic = audio
  musicStarted = true
  audio.play().catch(() => {
    // Autoplay may be blocked until the first user interaction — retry on it
    const retry = () => {
      audio.play().catch(() => {})
    }
    window.addEventListener('pointerdown', retry, { once: true })
  })
}

export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause()
    currentMusic.currentTime = 0
  }
  musicStarted = false
}

/** Turn background music on/off (persisted on the device). */
export function setMusicMuted(value: boolean) {
  musicMuted = value
  writeFlag(MUSIC_KEY, value)
  if (value) {
    currentMusic?.pause()
    musicStarted = false
  } else {
    playMusic()
  }
}

export function isMusicMuted() {
  return musicMuted
}

/** Turn sound effects on/off (persisted on the device). */
export function setSfxMuted(value: boolean) {
  sfxMuted = value
  writeFlag(SFX_KEY, value)
}

export function isSfxMuted() {
  return sfxMuted
}
