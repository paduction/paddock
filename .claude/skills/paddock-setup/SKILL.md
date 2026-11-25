---
name: paddock-setup
description: Install and configure Paddock for a person's Home Assistant home. Use when someone wants to set Paddock up, connect it to their Home Assistant, create or edit their paddock.yaml, add a room, device or screen to their wall tablet, or fix a configuration problem.
---

# Setting Paddock up for a home

You are helping someone put their own home on a wall tablet. They may not be a developer.
Speak their language (French or English), one step at a time, and do the typing for them.
Read `AGENTS.md` first if you have not: its rules about secrets and about acting on the home apply here.

The result is one file, `paddock.yaml`, describing which Home Assistant entities appear where.
You do not change any code.

## 1. Prepare

1. Run `pnpm install` if `node_modules` is missing.
2. Check the connection settings **without displaying them**:

   ```bash
   test -f tools/deploy.local.env && grep -c -E '^HA_(URL|TOKEN)=.+' tools/deploy.local.env
   ```

   If the file is missing, `cp tools/deploy.example.env tools/deploy.local.env`.
   If the count is below 2, ask the person to open that file and fill in:
   - `HA_URL` — the address they use for Home Assistant, e.g. `http://homeassistant.local:8123`;
   - `HA_TOKEN` — Home Assistant → their profile (bottom left) → Security → Long-lived access tokens → Create.

   They type the token into the file themselves. Never ask for it in the conversation, never print it.

## 2. Look at the home

```bash
pnpm discover --draft
```

- Read `paddock.discovery.local.json`: for each setting of `paddock.yaml`, the entities that fit, with names and areas.
- If it fails: "does not answer" → wrong `HA_URL` or not on the home network; "refused the token" → new token.
- The draft goes to `paddock.yaml`, or to `paddock.draft.local.yaml` when a `paddock.yaml` already exists.
  **Never overwrite an existing `paddock.yaml`**: edit it.

## 3. Ask what belongs on the wall

A good wall tablet shows what the household uses every day, not everything Home Assistant knows.
Summarise what you found in two or three lines, then ask — a few questions at a time:

- **Language** of the interface (`locale`: `fr` or `en`).
- **Lights**: which ones, grouped under which room names? Technical entities (LED indicators, groups that
  duplicate their members) usually do not belong.
- **Shutters**: which, and how to group them (shutters of one group move together).
- **Home page**: thermostat? gate or garage door? battery alerts?
- **Sidebar**: which weather entity, which one or two indoor temperature sensors, the pool?
- **People and calendars** to show.
- **Optional screens**: cameras, music, cinema, films, games, energy, outdoor, cleaning. Offer only those
  whose requirements are met (see below), and say what a screen needs when it is not available yet.

## 4. Write paddock.yaml

- Start from the draft. Remove what the person did not choose; rename with their words.
- `id` values are short, lowercase, unique (`living`, `desk`).
- Icons are Material Symbols names. Sensible defaults: `light` (ceiling), `table_lamp`, `floor_lamp`,
  `lightbulb`, `tv`, `wb_iridescent` (LED strip), `blinds`, `garage_home`, `valve`, `park`.
- For optional screens, copy the block from `paddock.example.yaml` and replace every entity id with a real one
  from the discovery file. Leave out optional fields you cannot fill rather than inventing a value.
- Keys and passwords: `rawgKey: !secret paddock_rawg_key`. Tell the person to add the value to
  Home Assistant's `secrets.yaml` themselves.
- Reference for every setting: `docs/en/configuration.md` (`docs/fr/` in French).

What the optional screens need (details in `docs/en/modules.md`):

| Screen | Offer it when discovery found… | Otherwise |
|---|---|---|
| Cameras | `camera` entities | — |
| Music | Music Assistant players (`music.speakers` section not empty) | Needs Music Assistant |
| Games | PlayStation Network entities | Needs that integration |
| Cleaning | `vacuum` entities | — |
| Energy | energy sensors in kWh | — |
| Outdoor | switches the person names (pump, garden lights) | — |
| Cinema | the person already has an `input_boolean` and scripts for their projector / screen | They must create those first; do not create automations for them unless asked |
| Films | a Plex server **and** they agree to run `server/plex-info` | Explain the two steps in `docs/en/modules.md` |

## 5. Check

```bash
pnpm config:check
```

Repeat until: 0 errors, 0 missing entities. Then explain each remaining line:

- `error` — a required setting is missing or has the wrong kind of value: fix it.
- `warning … is not a Paddock setting` — a typo in a setting name: fix it.
- `warning … is not an entity id like light.…` — wrong kind of entity for that place (e.g. a `switch` listed as
  a light). Either pick the right entity or tell the person that device cannot go there.
- `missing` — the entity does not exist in Home Assistant: wrong id.
- `offline` — the entity exists but is unavailable right now: keep it, mention it.

## 6. Install

Ask before this step: it writes to their Home Assistant.

- If `HA_HOST` is set in `tools/deploy.local.env` and they agree: `pnpm run deploy`.
- Otherwise run `pnpm build` and give them the four copies listed in `docs/en/install.md`, section "By hand".

Then list what only they can do, in order:

1. Restart Home Assistant (first install, and whenever the integration is updated).
2. Settings → Devices & services → Add integration → **Paddock**.
3. Open `http://<their-home-assistant>:8123/local/paddock.html` on the tablet and enter the address and a token.
4. Create a non-administrator account for the tablet: `docs/en/security.md`.
5. Set the tablet up as a display: `docs/en/tablet.md`.

## Later changes

"Add the new lamp", "remove the pool", "the kitchen shutter does not respond": run `pnpm discover` again if the
entity is new, edit `paddock.yaml`, `pnpm config:check`, then deploy with their agreement and tell them to reload
the page on the tablet. Home Assistant does not need a restart for a change of `paddock.yaml`.

## Do not

- Do not edit files under `apps/`, `packages/` or `custom_components/` to make a configuration work.
  If Paddock cannot show what the person wants, say so; changing the code is a different task (`/paddock-develop`).
- Do not operate their devices to "test". `pnpm config:check` is the test.
- Do not commit `paddock.yaml`, the discovery files or `tools/deploy.local.env`.
