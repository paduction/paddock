/**
 * Paddock configuration: which Home Assistant entities appear where. This is the shape of paddock.yaml.
 * Kept as plain data so a future visual editor can read and write it.
 * When a field changes here, change validate.ts (the same shape, checked at startup) and configuration.md in docs/en and docs/fr.
 */

export interface LightConfig {
  id: string
  entity: string
  name: string
  room: string
  /** Material Symbols name, e.g. 'table_lamp'. */
  icon: string
  /** Optional occupancy sensor shown as "· presence" on the tile. */
  presence?: string
}

export interface SceneConfig {
  id: string
  entity: string
  name: string
  icon: string
}

/** One row of the Lighting page: a room of lights, or the scenes + "all off" row. */
export type LightingRow = { type: 'room'; room: string } | { type: 'scenes' }

export interface PersonConfig {
  name: string
  entity: string
}

export interface CalendarConfig {
  entity: string
  name: string
  /** Where it comes from, shown in the agenda details (e.g. "iCloud") */
  source?: string
  /** Initials of the people concerned by every event of this calendar ('' = none). */
  people?: string
}

export interface IndoorSensorConfig {
  label: string
  icon: string
  tone: 'accent' | 'blue'
  temperature: string
  humidity?: string
}

export interface CoverConfig {
  id: string
  entity: string
  name: string
  group: string
}

export interface ClimateConfig {
  entity: string
  name: string
  /** Used when the thermostat does not report its own current temperature. */
  temperatureSensor?: string
}

export interface GateConfig {
  entity: string
  name: string
  /** Show an alert when open longer than this (minutes). */
  alertAfterMinutes: number
}

export interface CinemaConfig {
  /** input_boolean that runs your "cinema mode" automations. */
  toggle: string
  /** Lights that must be off (ids from lighting.lights). */
  dimLights: string[]
  screen: { down: string; up: string }
  projector: { on: string; off: string }
  amplifier: string
  /** Light tile shown on the cinema page (id from lighting.lights). */
  light?: string
  /** TV / Apple TV of the room: now playing card and remote. */
  player?: { name: string; media: string; remote: string }
}

export interface AlertsConfig {
  batteries: string[]
  batteryLow: number
  /** Météo-France vigilance sensor (Jaune / Orange / Rouge). */
  vigilance?: string
  /** Météo-France next rain sensor (1_hour_forecast attribute). */
  nextRain?: string
  /** Person sensors; defaults to the cameras' person sensors */
  people?: { name: string; sensor: string }[]
}

export interface TvConfig {
  media: string
  remote: string
  name: string
  /** Word that identifies this TV's Plex player (passed to the play script). */
  plexKeyword: string
  /** "au cinéma", "in the living room" — used in "Open Plex …". */
  where: string
  /** Remote title, e.g. "Apple TV du cinéma". */
  remoteTitle: string
}

export interface MoviesConfig {
  /** plex-info service (see server/plex-info). */
  server: string
  /** Script that opens the movie in Plex on the chosen TV. */
  playScript: string
  tvs: TvConfig[]
}

export interface SpeakerConfig {
  /** Music Assistant player */
  entity: string
  name: string
  /** Players grouped with it before playing (e.g. the second HomePod of a stereo pair). */
  members?: string[]
}

export interface MusicConfig {
  /** Default player (Music Assistant). */
  player: string
  speakers: SpeakerConfig[]
  /** Playlist shown in the queue. */
  playlist?: string
}

export interface EnergyConfig {
  /** Live rates (%) used until today's statistics are loaded */
  autonomy?: string
  selfConsumption?: string
  /** Battery level in kWh */
  battery?: string
  /** Capacity in kWh; omit for a virtual battery (no %) */
  batteryCapacityKwh?: number
  /** Shown under the battery when there is no capacity, e.g. "Virtual battery" */
  batteryNote?: string
  /** Cumulative energy sensors (kWh) */
  solar?: string
  grid?: string
  green?: string
  discharge?: string
  charge?: string
}

export interface DeviceConfig {
  entity: string
  name: string
  icon: string
  /** Status texts, e.g. "Filtering" / "Stopped" */
  on: string
  off: string
}

export interface OutdoorConfig {
  /** Pool water temperature */
  pool?: string
  /** Big tile under the pool (pump) */
  poolDevice?: DeviceConfig
  devices: DeviceConfig[]
}

/**
 * Cleaning modes as two choices: what (vacuum, mop, both) and how hard (quick, normal…).
 * `options[kind][level]` is the matching option of the select entity; a missing pair is not offered.
 */
/** Game console (PlayStation Network integration + optional power switch, e.g. ps5-mqtt). */
export interface GamingConfig {
  /** Column title */
  name: string
  /** Console media player from the PlayStation Network integration (game title and artwork) */
  console: string
  account?: {
    /** sensor: online status (online, away, offline…) */
    status?: string
    /** sensor: last online */
    lastOnline?: string
    /** sensor: now playing (its history gives the last game played) */
    nowPlaying?: string
    /** sensor: trophy level */
    trophyLevel?: string
    /** sensor: online ID */
    onlineId?: string
    /** image: avatar */
    avatar?: string
    /** binary_sensor: PlayStation Plus */
    plus?: string
    /** sensors: progress to the next trophy level (%) and trophy counts */
    nextLevel?: string
    platinum?: string
    gold?: string
    silver?: string
    bronze?: string
  }
  /** switch: on = awake, off = rest mode (ps5-mqtt) */
  power?: string
  /** Free personal key from rawg.io (developer, publisher, genres, Metacritic score). Keep it in the private config. */
  rawgKey?: string
  /**
   * Sound of the wall tablet while a trailer plays: its media player (Fully Kiosk) is set to `volume` %
   * when a trailer opens and back to `restore` % (default 0) when it closes. Only on the Android tablet.
   */
  trailerSound?: { player: string; volume?: number; restore?: number }
  /** Wikipedia language for the game description (default: the interface language) */
  wikipedia?: string
}

export interface RobotModesConfig {
  kinds: { id: string; label: string; icon?: string }[]
  levels: { id: string; label: string; icon?: string }[]
  options: Record<string, Record<string, string>>
  /** Mode preselected for the next run (defaults to the robot's current mode) */
  default?: { kind: string; level: string }
}

export interface RobotConfig {
  entity: string
  /** Panel title (room) and robot model */
  name: string
  model: string
  battery?: string
  /** select entity with the cleaning modes */
  mode?: string
  /** Modes as a "what × intensity" grid. Without it, a button cycles through the modes. */
  modes?: RobotModesConfig
  /** Display names of the modes (button without grid) */
  modeLabels?: Record<string, string>
  /** Sensor reporting error codes */
  error?: string
  /** Rooms for vacuum.clean_area (HA areas linked to the robot's rooms) */
  rooms?: { area: string; name: string }[]
  /** Rooms grouped in zones (area ids): the panel then shows the zones, rooms on demand */
  zones?: { id: string; name: string; icon: string; rooms: string[] }[]
}

export interface CameraConfig {
  entity: string
  name: string
  /** binary_sensor "person detected" */
  person?: string
  /** Refresh the snapshot every few seconds in the grid */
  live?: boolean
}

export interface CamerasConfig {
  list: CameraConfig[]
  doorbell?: { event: string; camera: string }
  /** select entities of the security system; the first one is read, all are set */
  security?: string[]
  /** media_source folder with recorded events */
  eventsRoot?: string
}

export interface PaddockConfig {
  locale: 'fr' | 'en'
  /** Minutes without a touch before the screensaver. */
  idleMinutes: number
  home: {
    summary?: string
    climate?: ClimateConfig
    gate?: GateConfig
    cinema?: CinemaConfig
    alerts: AlertsConfig
  }
  covers: CoverConfig[]
  movies?: MoviesConfig
  /** Game console, shown on the cinema page instead of the player column */
  gaming?: GamingConfig
  music?: MusicConfig
  energy?: EnergyConfig
  outdoor?: OutdoorConfig
  cleaning?: { robots: RobotConfig[] }
  cameras?: CamerasConfig
  lighting: {
    rows: LightingRow[]
    lights: LightConfig[]
    scenes: SceneConfig[]
  }
  people: PersonConfig[]
  calendars: CalendarConfig[]
  sidebar: {
    weather?: string
    sun?: string
    outdoorTemperature?: string
    outdoorHumidity?: string
    indoor: IndoorSensorConfig[]
    pool?: string
  }
}
