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
  /** super units get a golden glow */
  isSuper?: boolean
}

/*
 * Combat is fast-paced and HP is hidden: the more expensive a unit is,
 * the tougher it is. The cheapest Arseniy dies to Sasha in one hit.
 */
export const PLAYER_UNITS: UnitType[] = [
  {
    id: 'arseniy-ezhp',
    name: 'Арсений (ЭЖП)',
    image: '/assets/arseniy-ezhp.png',
    cardImage: '/assets/arseniy-card-1.png',
    cost: 10,
    hp: 20,
    damage: 10,
    speed: 7,
    size: 20,
  },
  {
    id: 'arseniy-fpu',
    name: 'Арсений (ФПУ)',
    image: '/assets/arseniy-fpu.png',
    cardImage: '/assets/arseniy-card-2.png',
    cost: 20,
    hp: 45,
    damage: 18,
    speed: 6,
    size: 22,
  },
  {
    id: 'arseniy-os',
    name: 'Арсений (ОС)',
    image: '/assets/arseniy-os.png',
    cardImage: '/assets/arseniy-card-3.png',
    cost: 50,
    hp: 95,
    damage: 30,
    speed: 5,
    size: 26,
  },
]

/** Pill + Arseniy = super Arseniy. Tier depends on which Arseniy the pill was dropped on. */
export const SUPER_UNITS: Record<string, UnitType> = {
  'arseniy-ezhp': {
    id: 'super-small',
    name: 'Супер Арсений (малый)',
    image: '/assets/arseniy-ezhp.png',
    cost: 0,
    hp: 60,
    damage: 25,
    speed: 8,
    size: 22,
    isSuper: true,
  },
  'arseniy-fpu': {
    id: 'super-medium',
    name: 'Супер Арсений (средний)',
    image: '/assets/arseniy-fpu.png',
    cost: 0,
    hp: 130,
    damage: 42,
    speed: 7,
    size: 26,
    isSuper: true,
  },
  'arseniy-os': {
    id: 'super-big',
    name: 'Супер Арсений (большой)',
    image: '/assets/arseniy-os.png',
    cost: 0,
    hp: 280,
    damage: 65,
    speed: 6,
    size: 32,
    isSuper: true,
  },
}

export const ENEMY_UNITS: Record<string, UnitType> = {
  danil: {
    id: 'danil',
    name: 'Данил (ЭЖП)',
    image: '/assets/danil.png',
    cost: 0,
    hp: 18,
    damage: 8,
    speed: 6,
    size: 19,
  },
  luntik: {
    id: 'luntik',
    name: 'Лунтик',
    image: '/assets/luntik.png',
    cost: 0,
    hp: 40,
    damage: 12,
    speed: 5,
    size: 20,
  },
  driggert: {
    id: 'driggert',
    name: 'Дриггерт Матвей',
    image: '/assets/driggert.png',
    cost: 0,
    hp: 100,
    damage: 25,
    speed: 4.5,
    size: 24,
  },
  sasha: {
    id: 'sasha',
    name: 'Саша Вачаева',
    image: '/assets/sasha.png',
    cost: 0,
    hp: 30,
    damage: 20,
    speed: 7,
    size: 19,
  },
}

/** Every character shown in the gallery */
export interface GalleryCharacter {
  id: string
  name: string
  image: string
  description: string
  side: 'player' | 'enemy'
}

export const GALLERY_CHARACTERS: GalleryCharacter[] = [
  {
    id: 'arseniy-ezhp',
    name: 'Арсений (ЭЖП)',
    image: '/assets/arseniy-ezhp.png',
    description: 'Самый дешёвый боец. Быстрый, но хрупкий.',
    side: 'player',
  },
  {
    id: 'arseniy-fpu',
    name: 'Арсений (ФПУ)',
    image: '/assets/arseniy-fpu.png',
    description: 'Средний по цене и силе Арсений.',
    side: 'player',
  },
  {
    id: 'arseniy-os',
    name: 'Арсений (ОС)',
    image: '/assets/arseniy-os.png',
    description: 'Самый дорогой и самый мощный Арсений.',
    side: 'player',
  },
  {
    id: 'super-arseniy',
    name: 'Супер Арсений',
    image: '/assets/arseniy-os.png',
    description: 'Таблетка + Арсений = супер сила!',
    side: 'player',
  },
  {
    id: 'danil',
    name: 'Данил (ЭЖП)',
    image: '/assets/danil.png',
    description: 'Обычный враг. Слабый, но их много.',
    side: 'enemy',
  },
  {
    id: 'luntik',
    name: 'Лунтик',
    image: '/assets/luntik.png',
    description: 'Брат Арсения Н. Покрепче Данила.',
    side: 'enemy',
  },
  {
    id: 'sasha',
    name: 'Саша Вачаева',
    image: '/assets/sasha.png',
    description: 'Быстрая и больно бьёт. Дешёвые Арсении взрываются с одного удара!',
    side: 'enemy',
  },
  {
    id: 'driggert',
    name: 'Дриггерт Матвей',
    image: '/assets/driggert.png',
    description: 'Самый опасный враг. Танк.',
    side: 'enemy',
  },
]

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
    spawnIntervalMs: 11000,
    firstSpawnDelayMs: 9000,
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
/** Cost of buying the pill itself */
export const PILL_COST = 15
/** Reward from the "Помощь" plashka ad on level 2+ */
export const HELP_REWARD = 100
export const HELP_COOLDOWN_MS = 90000
