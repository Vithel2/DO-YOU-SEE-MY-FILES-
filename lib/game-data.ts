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
/*
 * Card → spawned image mapping (per the author's spec):
 *   card 1 (покупки676х736)          → Арсений_Н_ИзФПУ
 *   card 2 (покупки 2вариант 684х736) → Арсений_Н_ИзЭЖП
 *   card 3 (покупки 3вариант 680х736) → Арсений_Н_ИзОС
 */
export const PLAYER_UNITS: UnitType[] = [
  {
    id: 'arseniy-fpu',
    name: 'Арсений (ФПУ)',
    image: '/assets/arseniy-fpu.png',
    cardImage: '/assets/arseniy-card-1.png',
    cost: 10,
    hp: 20,
    damage: 10,
    speed: 7,
    size: 20,
  },
  {
    id: 'arseniy-ezhp',
    name: 'Арсений (ЭЖП)',
    image: '/assets/arseniy-ezhp.png',
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

/**
 * Pill + Arseniy = super Arseniy («Арсений после таблетки»).
 * Same picture for all tiers — only size, HP and damage grow
 * with the price of the Arseniy the pill was given to.
 */
export const SUPER_UNITS: Record<string, UnitType> = {
  'arseniy-fpu': {
    id: 'super-small',
    name: 'Супер Арсений (малый)',
    image: '/assets/arseniy-super.png',
    cost: 0,
    hp: 60,
    damage: 25,
    speed: 8,
    size: 20,
    isSuper: true,
  },
  'arseniy-ezhp': {
    id: 'super-medium',
    name: 'Супер Арсений (средний)',
    image: '/assets/arseniy-super.png',
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
    image: '/assets/arseniy-super.png',
    cost: 0,
    hp: 280,
    damage: 65,
    speed: 6,
    size: 34,
    isSuper: true,
  },
}

/** Level 6 boss: stands at the enemy base and fires eye lasers. */
export const BOSS_UNIT: UnitType = {
  id: 'evil-clone',
  name: 'Злой клон Арсения',
  image: '/assets/evil-clone.png',
  cost: 0,
  hp: 4000,
  damage: 0,
  speed: 0,
  size: 40,
}

/** Fast little red arseniys that run out of the boss. */
export const MINI_RED_UNIT: UnitType = {
  id: 'mini-red',
  name: 'Красный мини-Арсений',
  image: '/assets/red-arseniy.png',
  cost: 0,
  hp: 14,
  damage: 6,
  speed: 15,
  size: 12,
}

/** Boss laser damage */
export const LASER_FIGHTER_DAMAGE = 35
export const LASER_BASE_DAMAGE = 18
export const LASER_INTERVAL_S = 2.8
/** Heal can (level 6): restores player base HP */
export const HEAL_CAN_VALUE = 80
/** Vadim's nuke impact damage to the player base */
export const NUKE_DAMAGE = 130
/** Radiation duration after the nuke, seconds */
export const RADIATION_DURATION_S = 25

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
    id: 'arseniy-fpu',
    name: 'Арсений (ФПУ)',
    image: '/assets/arseniy-fpu.png',
    description: 'Самый дешёвый боец. Быстрый, но хрупкий.',
    side: 'player',
  },
  {
    id: 'arseniy-ezhp',
    name: 'Арсений (ЭЖП)',
    image: '/assets/arseniy-ezhp.png',
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
    image: '/assets/arseniy-super.png',
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
  {
    id: 'evil-clone',
    name: 'Злой клон Арсения',
    image: '/assets/evil-clone.png',
    description: 'Босс 6 уровня. Стреляет лазерами из глаз!',
    side: 'enemy',
  },
  {
    id: 'mini-red',
    name: 'Красный мини-Арсений',
    image: '/assets/red-arseniy.png',
    description: 'Выбегает из Злого клона. Очень быстрый!',
    side: 'enemy',
  },
  {
    id: 'evil-vadim',
    name: 'Злой Вадим на ядерной тачке',
    image: '/assets/evil-vadim-car.png',
    description: 'Его не остановить. Едет прямо в базу!',
    side: 'enemy',
  },
  {
    id: 'tupichkina',
    name: 'Тупичкина',
    image: '/assets/tupichkina.png',
    description: 'Падает с неба прямо на базу. Жуть.',
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
  /**
   * Level 6 boss mode: red sky, screen shake, no normal enemy waves —
   * instead the Evil Clone boss with lasers, mini-arseniys and events
   * (Vadim's nuke car, radiation, Tupichkina, virus screen).
   */
  chaos?: boolean
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
  {
    level: 3,
    name: 'Уровень 3',
    playerBaseHp: 400,
    enemyBaseHp: 800,
    enemyPool: [
      { id: 'danil', weight: 3 },
      { id: 'luntik', weight: 3 },
      { id: 'sasha', weight: 2 },
      { id: 'driggert', weight: 1 },
    ],
    spawnIntervalMs: 4800,
    firstSpawnDelayMs: 3500,
  },
  {
    level: 4,
    name: 'Уровень 4',
    playerBaseHp: 450,
    enemyBaseHp: 1100,
    enemyPool: [
      { id: 'danil', weight: 2 },
      { id: 'luntik', weight: 3 },
      { id: 'sasha', weight: 3 },
      { id: 'driggert', weight: 2 },
    ],
    spawnIntervalMs: 4200,
    firstSpawnDelayMs: 3000,
  },
  {
    level: 5,
    name: 'Уровень 5',
    playerBaseHp: 500,
    enemyBaseHp: 1500,
    enemyPool: [
      { id: 'danil', weight: 1 },
      { id: 'luntik', weight: 2 },
      { id: 'sasha', weight: 3 },
      { id: 'driggert', weight: 3 },
    ],
    spawnIntervalMs: 3600,
    firstSpawnDelayMs: 2500,
  },
  {
    level: 6,
    name: 'Уровень 6: ЖЕСТЬ',
    playerBaseHp: 600,
    // In boss mode this value is unused — the boss HP (BOSS_UNIT.hp) is the win condition
    enemyBaseHp: 4000,
    enemyPool: [],
    spawnIntervalMs: 999999,
    firstSpawnDelayMs: 999999,
    chaos: true,
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
