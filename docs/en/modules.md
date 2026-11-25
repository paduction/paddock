# What each screen needs

A screen appears when its part of `paddock.yaml` is filled in. Home, Lighting and Shutters are always there;
the others are optional. This page says what each one expects from Home Assistant.

| Screen | Setting | Needs in Home Assistant |
|---|---|---|
| Home | `home`, `sidebar`, `people`, `calendars` | People, calendars, a weather entity, temperature sensors. All optional except `home.alerts`. |
| Lighting | `lighting` | `light` entities and, if you want, `scene` entities. |
| Shutters | `covers` | `cover` entities. |
| Cinema | `home.cinema` | An `input_boolean` that starts your own "cinema mode" automations, four `script`s (screen down / up, projector on / off), an amplifier switch. |
| Films | `movies` | A Plex server, the small **plex-info** service of this repository, and a script that opens a film on a TV. See below. |
| Games | `gaming` | The **PlayStation Network** integration. Optional: a power switch (e.g. [ps5-mqtt](https://github.com/FunkeyFlo/ps5-mqtt)) and a free [RAWG](https://rawg.io/apidocs) key for game details. |
| Music | `music` | **[Music Assistant](https://www.music-assistant.io)** and its Home Assistant integration. The players listed must be Music Assistant players. |
| Energy | `energy` | Cumulative energy sensors in kWh (solar, grid, battery). |
| Outdoor | `outdoor` | Switches (pool pump, garden lights…) and a pool temperature sensor. |
| Cleaning | `cleaning` | `vacuum` entities. Room cleaning uses `vacuum.clean_area`, so the robot's rooms must be linked to Home Assistant areas. |
| Cameras | `cameras` | `camera` entities. Optional: person sensors, a doorbell `event` entity, security mode selects. |
| Automations | — | The Paddock integration 0.4.0 or later. Uses the devices already in `paddock.yaml`: see [automations.md](automations.md). |

## Things that are specific

**Camera security modes.** `cameras.security` lists `select` entities whose options are exactly
`Home`, `Away` and `Disarmed` — what the Eufy integration provides. Another alarm system needs a template
`select` with those three options, or leave the setting out: the cameras still work.

**Doorbell.** `cameras.doorbell.event` is an `event` entity that fires `ring`. When it rings, the tablet
shows the doorbell camera full screen.

**Weather alerts.** `home.alerts.vigilance` and `nextRain` expect the sensors of the **Météo-France**
integration. Elsewhere, leave them out.

**Daily summary.** `home.summary` is an `input_text` (or any entity whose state is a sentence) that your own
automation fills, for example with an AI summary of the day. Paddock only displays it.

**Trailer sound.** `gaming.trailerSound` raises the tablet's volume while a game trailer plays and puts it
back afterwards. It needs the **Fully Kiosk Browser** integration (the tablet's `media_player`). Some tablets
stutter when a video plays with sound; in that case leave it out.

## Films: plex-info and the play script

The Films screen reads your Plex library through a small service, so that your Plex token never reaches the tablet.

1. On a machine that is always on (the one running Plex is fine), with Docker:

   ```bash
   cd server/plex-info
   cp .env.example .env      # put PLEX_URL and PLEX_TOKEN in it
   docker compose up -d
   ```

   Check it: `http://<that-machine>:8098/health` answers `{"ok": true, "token": true, "plex": true}`.

2. Add a script to Home Assistant that opens a film on a TV. An example for Apple TV is in
   [docs/examples/plex_play_script.yaml](../examples/plex_play_script.yaml). Paddock calls it with
   `title`, `library`, `resume`, `tv` (the media player) and `room` (the TV's `plexKeyword`).

3. Fill in `movies` in `paddock.yaml`:

   ```yaml
   movies:
     server: http://192.168.1.20:8098
     playScript: script.paddock_plex_play
     tvs:
       - media: media_player.apple_tv
         remote: remote.apple_tv
         name: Living room
         plexKeyword: living
         where: in the living room
         remoteTitle: Living room Apple TV
   ```

The service is read-only and has no password: keep it on your home network, never on the internet.
