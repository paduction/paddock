# Paddock — guide for AI assistants (and people in a hurry)

Paddock is an interface for Home Assistant, made for a wall tablet, that also runs as a desktop app.
This file tells you how the repository works, what you may and may not do, and how to help someone install it.

Two kinds of requests come up:

- **"Set Paddock up for my home"** → follow [Setting up a home](#setting-up-a-home). You edit `paddock.yaml`, not the code.
- **"Change or add something in Paddock"** → follow [Changing the code](#changing-the-code).

## Rules that always apply

1. **Nothing about a real home goes into a tracked file.** Entity ids, room names, people's names, addresses,
   tokens and keys live in git-ignored files only: `paddock.yaml`, `tools/deploy.local.env`, anything named
   `*.local.*`, `.env`. The example configuration uses a fictional home with neutral names; keep it that way.
2. **Never print, log, commit or copy a secret.** That means `HA_TOKEN`, the Plex token, the RAWG key.
   Do not `cat` the files that hold them; check that a value is set with `grep -c`, not by displaying it.
   In `paddock.yaml`, a secret is written `!secret name` and its value goes in Home Assistant's `secrets.yaml`.
3. **Ask before acting on the home.** Reading from Home Assistant (`pnpm discover`, `pnpm config:check`) is always
   fine. Deploying, restarting Home Assistant, or calling a service that moves something (a gate, a shutter,
   a heater) needs the person's explicit yes. Never test a setting by operating a real device.
4. **Do not invent entity ids.** Use the ones `pnpm discover` found. If something is missing, say so and ask.
5. **English for code, comments and commit messages.** Interface texts exist in French and English, always both.

## Map

```
packages/core/               no React, no browser UI
  src/ha/                    the Home Assistant connection (WebSocket), credentials
  src/domain/                rules of the home: entity state → what to show, action → which service to call. Tested.
  src/config/schema.ts       the shape of paddock.yaml (TypeScript interfaces, each field commented)
  src/config/validate.ts     the same shape as a runtime check (errors and warnings with their path)
packages/ui/                 no Home Assistant: touch components, props in, events out
  src/components/<Name>/     <Name>.tsx + <Name>.module.css
  src/tokens/tokens.css      design tokens (--pd-*), dark and light themes
apps/tablet/                 the app
  src/main.tsx               sign in → fetch paddock.yaml from Home Assistant → load the screens (start.tsx)
  src/config/                the live configuration object + the example (fictional home)
  src/stores/*.store.ts      controllers: read entities, apply domain rules, expose actions (Zustand)
  src/widgets/*Widget.tsx    one store connected to one ui component
  src/pages/*Page.tsx        a screen: layout of widgets
  src/shell/                 sidebar, tabs (tabs.ts hides unconfigured screens), setup screen
  src/i18n/fr.ts, en.ts      every text of the interface; fr.ts defines the keys
  src/desktop.ts             the only file that knows about the desktop shell
apps/desktop/                Tauri shell (Rust): a window around the tablet build, two commands, no UI code
custom_components/paddock/   Home Assistant integration (Python): serves paddock.yaml to signed-in devices,
                             the paddock.assign_account service, and the automations (schedules and modes):
                             automations_model.py = the rules (no Home Assistant import), automations.py = storage, timers, websocket
tests/                       tests of the integration inside a test Home Assistant (pytest)
server/plex-info/            optional service (Python, Docker): read-only view of a Plex library for the Films screen
tools/                       discover.ts, config-check.ts, config-export.ts, deploy.sh
docs/en, docs/fr             user documentation, same pages in both languages
paddock.example.yaml         generated from the example configuration: pnpm config:export --example
```

The layering rule: `ui` never imports `core`'s Home Assistant code and never knows an entity id;
`core/domain` never imports React. A widget is the only place where the two meet.

## How the configuration travels

1. The person writes `paddock.yaml` and it is copied next to Home Assistant's `configuration.yaml`.
2. The integration answers the WebSocket command `paddock/config` with that file (secrets resolved),
   to any signed-in user. The static app itself contains no private data.
3. At startup the app signs in, fetches the configuration, validates it (`validateConfig`), and only then loads
   the screens. Invalid configuration → the setup screen lists the problems. The last good configuration is cached
   on the device for power cuts.

## Commands

| Command | What it does | Touches the home? |
|---|---|---|
| `pnpm install` | Installs dependencies. | no |
| `pnpm discover` | Lists the entities Paddock can use → `paddock.discovery.local.md` / `.json`. | reads |
| `pnpm discover --draft` | Also writes a first `paddock.yaml` (or `paddock.draft.local.yaml` if one exists). | reads |
| `pnpm config:check [file]` | Validates the configuration; with `HA_URL`/`HA_TOKEN`, checks every entity exists. Exit 1 on problems. | reads |
| `pnpm config:check --example` | Validates the example configuration. | no |
| `pnpm config:export --example` | Regenerates `paddock.example.yaml` from `paddock.config.example.ts`. | no |
| `pnpm dev` | The app at http://localhost:5173 with live reload. | signs in |
| `pnpm typecheck` / `pnpm test` / `pnpm build` | TypeScript, Vitest, production build. | no |
| `pytest` | Tests of the integration (`pip install pytest-homeassistant-custom-component` first). | no |
| `pnpm run deploy` | Builds, checks `paddock.yaml`, copies app + integration + `paddock.yaml` over SSH. | **writes — ask first** |
| `pnpm desktop:dev` / `pnpm desktop:build` | Desktop app (needs Rust). | no |

`HA_URL`, `HA_TOKEN` and the SSH settings come from the environment or from `tools/deploy.local.env`
(template: `tools/deploy.example.env`).

## Setting up a home

The detailed, conversational version of this procedure is the skill `.claude/skills/paddock-setup/SKILL.md`.
In short:

1. `pnpm install`. Make sure `tools/deploy.local.env` exists; if not, copy the example and ask the person to fill
   in `HA_URL` and `HA_TOKEN` themselves (do not ask them to paste the token into the chat).
2. `pnpm discover --draft`, then read `paddock.discovery.local.json`.
3. Ask what they want on the wall: which rooms and lights, which optional screens. Do not include everything
   Home Assistant has; a wall tablet shows the dozen things used every day.
4. Edit `paddock.yaml`. `docs/en/configuration.md` describes every setting, `docs/en/modules.md` what each
   optional screen needs, `paddock.example.yaml` shows a complete file.
5. `pnpm config:check` until it reports 0 errors and 0 missing entities. Explain remaining warnings.
6. With the person's agreement: `pnpm run deploy`, or give them the manual steps of `docs/en/install.md`.
7. Tell them what is left to do by hand: restart Home Assistant, add the Paddock integration, open the address
   on the tablet, create a non-administrator account (`docs/en/security.md`), set the tablet up (`docs/en/tablet.md`).

## Changing the code

The step-by-step version is the skill `.claude/skills/paddock-develop/SKILL.md`. The essentials:

- **A new setting** changes four places together: `schema.ts` (interface + comment), `validate.ts` (same shape),
  `paddock.config.example.ts` (fictional value), `docs/en/configuration.md` and `docs/fr/configuration.md`.
  Then `pnpm config:export --example`.
- **A new behaviour** starts as a pure function in `core/src/domain/` with a test next to it, then a store,
  then a widget. Presentation goes in `packages/ui` with no knowledge of Home Assistant.
- **A new text** is added to `fr.ts` and `en.ts` with the same key. No hard-coded text in components.
- **Styling** uses the tokens (`var(--pd-…)`) and CSS Modules. No inline colours, no new font.
- **Animated backgrounds** (flames while heating, water line of the pool) are `packages/ui/src/components/Ambience`.
  A new one follows its rules: only `transform` and `opacity` move, each on its own element (the wall tablet is slow),
  flames go from one chance pose to the next rather than looping,
  and it is driven by a prop of the tile (`heating`, `pumping`), never by an entity.
- **Optional screens stay optional.** Code must work when an optional block of the configuration is absent.
- **The integration** is the only Python that runs in Home Assistant. It reads YAML 1.1, where the keys `on`
  and `off` become booleans: `_named_keys` restores them. Keep that in mind for any new setting name.
  The tools read and write `paddock.yaml` the same way (`tools/lib/ha.ts`): always go through `readYaml` / `writeYaml`.
- **Automations** have their shapes in two places that must agree: `core/src/domain/automations.ts` (interface)
  and `custom_components/paddock/automations_model.py` (what Home Assistant accepts and runs). A websocket command
  never uses the field `id`: it is the number of the message itself.
- Before finishing: `pnpm typecheck && pnpm test && pnpm build && pnpm config:check --example`, and `pytest` when the integration changed.

## Things that are easy to get wrong

- `paddock.yaml` at the repository root is the person's real home. It is git-ignored: never `git add -f` it,
  never paste its content into an issue, a commit message or a tracked file.
- The tablet caches the app aggressively; it is always opened through `/local/paddock.html` (`loader.html`),
  which adds a unique address on every load. Do not link to `index.html` directly.
- A change in `custom_components/paddock` only takes effect after Home Assistant restarts.
- Several screens depend on specific integrations (Music Assistant, PlayStation Network, Eufy-style security
  selects, Météo-France sensors, Fully Kiosk). `docs/en/modules.md` is the reference; do not assume they exist.
- `apps/desktop` must stay a thin shell. Interface changes go in `apps/tablet` and `packages/ui`,
  and desktop differences are decided with `isDesktop` from `apps/tablet/src/desktop.ts`.
