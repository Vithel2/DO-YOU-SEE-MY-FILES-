'use client'

/**
 * Local game progress: unlocked levels and characters met in battle.
 * Stored on the device so it survives page reloads (works offline / on phones).
 */

const MET_KEY = 'avd-met-characters'
const LEVEL_KEY = 'avd-max-level'

export function getMetCharacters(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(MET_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function markCharacterMet(id: string) {
  if (typeof window === 'undefined') return
  try {
    const met = getMetCharacters()
    if (met.has(id)) return
    met.add(id)
    window.localStorage.setItem(MET_KEY, JSON.stringify(Array.from(met)))
  } catch {
    // storage unavailable — ignore
  }
}

export function getMaxUnlockedLevel(): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = window.localStorage.getItem(LEVEL_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 1
    return Number.isFinite(n) && n >= 1 ? n : 1
  } catch {
    return 1
  }
}

export function setMaxUnlockedLevel(level: number) {
  if (typeof window === 'undefined') return
  try {
    const current = getMaxUnlockedLevel()
    if (level > current) window.localStorage.setItem(LEVEL_KEY, String(level))
  } catch {
    // storage unavailable — ignore
  }
}

/* --- Secret dev code (never mentioned anywhere in the game UI) --- */

const DEV_KEY = 'avd-dev'
// stored obfuscated so it's not trivially readable in the source
const SECRET = ['V', 'M', 'C', 'T'].join('')

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEV_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Try to apply an entered code. Returns true if the code was accepted.
 * The dev code unlocks all levels and gives a pile of money in battles.
 */
export function tryApplyCode(code: string, totalLevels: number): boolean {
  if (code.trim().toUpperCase() !== SECRET) return false
  try {
    window.localStorage.setItem(DEV_KEY, '1')
    window.localStorage.setItem(LEVEL_KEY, String(totalLevels))
  } catch {
    // storage unavailable — ignore
  }
  return true
}
