# paddock.yaml, setting by setting

`paddock.yaml` sits next to `configuration.yaml` in Home Assistant. A complete example is
[paddock.example.yaml](../../paddock.example.yaml). `pnpm config:check` verifies your file.

- **Entity ids** are written as in Home Assistant: `light.living_room`. `pnpm discover` lists yours.
- **Icons** are [Material Symbols](https://fonts.google.com/icons) names: `table_lamp`, `blinds`, `valve`.
- **Secrets**: `rawgKey: !secret paddock_rawg_key`, with the value in Home Assistant's `secrets.yaml`.
- **Texts that are just `on`, `off`, `yes` or `no`** must be quoted (`on: "On"`): Home Assistant reads the bare words as true / false. `pnpm config:check` catches it.
- Settings marked *optional* can be left out. Leaving out a whole optional block hides its screen.

## General

| Setting | | |
|---|---|---|
| `locale` | required | `en` or `fr`: language of the interface. |
| `idleMinutes` | required | Minutes without a touch before the screensaver (tablet only). |

## home — the home page

| Setting | | |
|---|---|---|
| `home.summary` | optional | Entity whose state is a sentence shown as "summary of the day". |
| `home.climate.entity` | optional block | `climate` entity of the thermostat tile. |
| `home.climate.name` | | Title of the tile. |
| `home.climate.temperatureSensor` | optional | Sensor to use when the thermostat does not report the room temperature. |
| `home.gate.entity` | optional block | `cover` entity of the gate or garage door. |
| `home.gate.name` | | Title of the tile. |
| `home.gate.alertAfterMinutes` | | An alert appears when it stays open longer than this. |
| `home.alerts.batteries` | required | List of battery sensors (%). May be empty: `[]`. |
| `home.alerts.batteryLow` | required | Level (%) under which a battery is reported. |
| `home.alerts.vigilance`, `nextRain` | optional | Météo-France sensors. |
| `home.alerts.people` | optional | List of `{ name, sensor }` person sensors for the "person detected" alert. Defaults to the cameras' person sensors. |

### home.cinema — cinema mode (optional block)

| Setting | | |
|---|---|---|
| `toggle` | required | `input_boolean` that your own automations watch to run the cinema mode. |
| `dimLights` | required | Ids (from `lighting.lights`) of the lights that must be off. |
| `screen.down`, `screen.up` | required | Scripts that move the projection screen. |
| `projector.on`, `projector.off` | required | Scripts that switch the projector. |
| `amplifier` | required | Switch (or any entity that turns on and off) of the amplifier. |
| `light` | optional | Id (from `lighting.lights`) of a light shown on the cinema page. |
| `player` | optional | `{ name, media, remote }`: the room's TV (media player and remote) for the "now playing" card and the remote. |

## lighting

| Setting | | |
|---|---|---|
| `lighting.lights[]` | required | `id` (short, unique), `entity`, `name`, `room`, `icon`; optional `presence` (occupancy sensor shown on the tile). |
| `lighting.scenes[]` | required, may be empty | `id`, `entity` (`scene`), `name`, `icon`. |
| `lighting.rows[]` | required | Layout of the page, top to bottom: `{ type: room, room: <name> }` for a row of lights, `{ type: scenes }` for the scenes and "all off" row. |

## covers — shutters

`covers[]`: `id`, `entity` (`cover`), `name`, `group` (shutters with the same group are shown and moved together).

## people, calendars, sidebar

| Setting | | |
|---|---|---|
| `people[]` | required, may be empty | `name`, `entity` (`person`). |
| `calendars[]` | required, may be empty | `entity` (`calendar`), `name`; optional `source` (e.g. "iCloud") and `people` (initials shown on every event). |
| `sidebar.weather` | optional | `weather` entity. |
| `sidebar.sun` | optional | Usually `sun.sun`. |
| `sidebar.outdoorTemperature`, `outdoorHumidity` | optional | Sensors that replace the weather entity's values. |
| `sidebar.indoor[]` | required, may be empty | Up to two rooms: `label`, `icon`, `tone` (`accent` or `blue`), `temperature`, optional `humidity`. |
| `sidebar.pool` | optional | Pool temperature sensor. |

## cameras (optional block)

| Setting | | |
|---|---|---|
| `cameras.list[]` | required | `entity` (`camera`), `name`; optional `person` (binary sensor) and `live: true` (refresh the picture every few seconds in the grid). |
| `cameras.doorbell` | optional | `{ event, camera }`: the `event` entity that fires `ring`, and the camera to show. |
| `cameras.security` | optional | `select` entities with the options `Home`, `Away`, `Disarmed`. The first is read, all are set together. |
| `cameras.eventsRoot` | optional | `media_source` folder holding recorded events. |

## music (optional block) — needs Music Assistant

| Setting | | |
|---|---|---|
| `music.player` | required | Default Music Assistant player. |
| `music.speakers[]` | required | `entity`, `name`; optional `members` (players grouped with it, e.g. the second speaker of a stereo pair). |
| `music.playlist` | optional | Name of the playlist shown in the queue. |

## movies (optional block) — needs plex-info, see modules.md

| Setting | | |
|---|---|---|
| `movies.server` | required | Address of the plex-info service, e.g. `http://192.168.1.20:8098`. |
| `movies.playScript` | required | Script that opens a film on a TV. |
| `movies.tvs[]` | required | `media`, `remote`, `name`, `plexKeyword` (word in the name of that TV's Plex player), `where` ("in the living room"), `remoteTitle`. |

## gaming (optional block) — needs the PlayStation Network integration

| Setting | | |
|---|---|---|
| `gaming.name` | required | Title of the column, e.g. `PS5`. |
| `gaming.console` | required | The console's `media_player`. |
| `gaming.account` | optional | Sensors of the account: `status`, `lastOnline`, `nowPlaying`, `trophyLevel`, `onlineId`, `avatar` (image), `plus` (binary sensor), `nextLevel`, `platinum`, `gold`, `silver`, `bronze`. |
| `gaming.power` | optional | Switch: on = awake, off = rest mode. |
| `gaming.rawgKey` | optional | Your RAWG key, as `!secret …`. Without it, only the Wikipedia description is shown. |
| `gaming.wikipedia` | optional | Wikipedia language for descriptions (defaults to `locale`). |
| `gaming.trailerSound` | optional | `{ player, volume, restore }`: tablet volume while a trailer plays, and after. |

## energy (optional block)

All optional: `solar`, `grid`, `green`, `charge`, `discharge` (cumulative kWh sensors), `battery` (kWh),
`batteryCapacityKwh` (number; leave out for a virtual battery), `batteryNote` (text shown instead),
`autonomy`, `selfConsumption` (live % sensors).

## outdoor (optional block)

| Setting | | |
|---|---|---|
| `outdoor.pool` | optional | Pool temperature sensor. |
| `outdoor.poolDevice` | optional | Big tile under the pool: `entity`, `name`, `icon`, `on` and `off` (status texts, e.g. "Filtering" / "Stopped"). |
| `outdoor.devices[]` | required, may be empty | Same fields, one tile each. |

## cleaning (optional block)

`cleaning.robots[]`:

| Setting | | |
|---|---|---|
| `entity`, `name`, `model` | required | The `vacuum`, the panel title, the model shown under it. |
| `battery`, `error` | optional | Sensors. |
| `mode` | optional | `select` entity with the cleaning modes. |
| `modeLabels` | optional | Display name of each option of `mode`. |
| `modes` | optional | Modes as a grid "what × how hard": `kinds[]` and `levels[]` (`id`, `label`, optional `icon`), `options` (`options.<kind>.<level>` = option of the select), optional `default`. |
| `rooms[]` | optional | `{ area, name }`: Home Assistant areas the robot can clean. |
| `zones[]` | optional | `{ id, name, icon, rooms }`: areas grouped in zones. |
