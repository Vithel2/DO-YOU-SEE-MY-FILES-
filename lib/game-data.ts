export interface UnitType {
  id: string
  name: string
  image: string
  cardImage?: string
  cost: number
  hp: number
  damage: number
  /** units of field width (0-100) per second */
  speed: number
  /** rendered height in % of field height */
  size: number
}

export const PLAYER_UNITS: UnitType[] = [
  {
    id: 'arseniy-ezhp',
    name: 'Арсений (ЭЖП)',
    image: '/assets/arseniy-ezhp.png',
    cardImage: '/assets/arseniy-card-1.png',
    cost: 10,
    hp: 50,
    damage: 6,
    speed: 7,
    size: 20,
  },
  {
    id: 'arseniy-fpu',
    name: 'Арсений (ФПУ)',
    image: '/assets/arseniy-fpu.png',
    cardImage: '/assets/arseniy-card-2.png',
    cost: 20,
    hp: 100,
    damage: 12,
    speed: 6,
    size: 22,
  },
  {
    id: 'arseniy-os',
    name: 'Арсений (ОС)',
    image: '/assets/arseniy-os.png',
    cardImage: '/assets/arseniy-card-3.png',
    cost: 50,
    hp: 220,
    damage: 24,
    speed: 5,
    size: 26,
  },
]

export const ENEMY_UNITS: Record<string, UnitType> = {
  danil: {
    id: 'danil',
    name: 'Данил (ЭЖП)',
    image: '/assets/danil.png',
    cost: 0,
    hp: 45,
    damage: 5,
    speed: 6,
    size: 19,
  },
  luntik: {
    id: 'luntik',
    name: 'Лунтик',
    image: '/assets/luntik.png',
    cost: 0,
    hp: 80,
    damage: 9,
    speed: 5,
    size: 20,
  },
  driggert: {
    id: 'driggert',
    name: 'Дриггерт Матвей',
    image: '/assets/driggert.png',
    cost: 0,
    hp: 150,
    damage: 16,
    speed: 4.5,
    size: 24,
  },
  sasha: {
    id: 'sasha',
    name: 'Саша Вачаева',
    image: '/assets/sasha.png',
    cost: 0,
    hp: 65,
    damage: 8,
    speed: 7,
    size: 19,
  },
}

export interface LevelConfig {
  level: number
  name: string
  playerBaseHp: number
  enemyBaseHp: number
  /** ids from ENEMY_UNITS with spawn weights */
  enemyPool: { id: string; weight: number }[]
  /** ms between enemy spawns */
  spawnIntervalMs: number
  firstSpawnDelayMs: number
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Уровень 1',
    playerBaseHp: 300,
    enemyBaseHp: 300,
    enemyPool: [
      { id: 'danil', weight: 3 },
      { id: 'luntik', weight: 2 },
    ],
    spawnIntervalMs: 8000,
    firstSpawnDelayMs: 6000,
  },
  {
    level: 2,
    name: 'Уровень 2',
    playerBaseHp: 350,
    enemyBaseHp: 550,
    enemyPool: [
      { id: 'danil', weight: 3 },
      { id: 'luntik', weight: 2 },
      { id: 'sasha', weight: 2 },
      { id: 'driggert', weight: 1 },
    ],
    spawnIntervalMs: 5500,
    firstSpawnDelayMs: 4000,
  },
]

export const CAN_DED_VALUE = 5
export const CAN_SHIZA_VALUE = 10
export const CAN_SPAWN_INTERVAL_MS = 5000
export const CAN_FALL_DURATION_MS = 4500
export const CAN_GROUND_LIFETIME_MS = 4000
export const AD_REWARD = 50
export const AD_COOLDOWN_MS = 45000
