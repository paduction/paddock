---
name: paddock-develop
description: Change Paddock's own code. Use when adding or changing a setting of paddock.yaml, a screen, a tile, a rule of behaviour, an interface text, the Home Assistant integration, or the desktop app.
---

# Changing Paddock

Read `AGENTS.md` first: the map of the repository and the layering rule are there.
This skill is the checklist for the common changes.

## Before you write anything

- Find the closest existing example and follow it: lights (`domain/lights.ts` → `stores/lights.store.ts` →
  `widgets/LightWidget.tsx` → `ui/components/LightTile`) is the simplest complete chain; covers adds drag gestures;
  cameras adds streams; gaming adds data from outside Home Assistant.
- Decide where each piece belongs: a decision about the home → `core/domain`; drawing or a gesture → `ui`;
  reading entities and calling services → a store; wiring → a widget.
- Use fictional, neutral names in every example, test and comment: "Living room", "Office", `light.desk`.
  No real home, no first names.

## Adding or changing a setting of paddock.yaml

Change these together, in this order:

1. `packages/core/src/config/schema.ts` — the field, with a comment that tells a non-developer what to put there.
2. `packages/core/src/config/validate.ts` — the same field in `SHAPE` (`str`, `num`, `bool`, `ent('domain')`,
   `choice(…)`, `list(…)`, `obj({…})`, `opt(…)`). Add a test in `validate.test.ts` if the rule is new.
3. `apps/tablet/src/config/paddock.config.example.ts` — a fictional value, so the example shows it.
4. `docs/en/configuration.md` and `docs/fr/configuration.md` — one line in the right table.
   If the setting needs something in Home Assistant, also `docs/*/modules.md`.
5. `pnpm config:export --example` to regenerate `paddock.example.yaml`.
6. `tools/discover.ts` — if entities for this setting can be recognised, add a section.

New settings are optional whenever possible, so existing homes keep working.
Avoid the setting names `on`, `off`, `yes`, `no`, `true`, `false` for new keys: Home Assistant's YAML reads them
as booleans (the two existing `on` / `off` pairs are restored by `_named_keys` in the integration).

## Adding behaviour

1. A pure function in `packages/core/src/domain/<topic>.ts`: entity state in, plain data out; or an action in,
   a `ServiceCall` out. No `fetch`, no `Date.now()` hidden inside: pass the time in.
2. A test beside it (`<topic>.test.ts`, Vitest). Tests describe the home's rule in the `it(…)` sentence.
3. Export it from `packages/core/src/index.ts`.
4. A store in `apps/tablet/src/stores/<topic>.store.ts` that reads entities with `useHass`, applies the rule and
   exposes actions calling `ha.call(…)`. Show the expected result immediately with `createHold` when Home
   Assistant is slow to report it.

## Adding something to see

1. A component in `packages/ui/src/components/<Name>/<Name>.tsx` with `<Name>.module.css`, exported from
   `packages/ui/src/index.ts`. Props are plain values and callbacks; all texts come in as props.
2. Tokens only (`var(--pd-surface)`, `var(--pd-accent)`, …) so both themes work. Keep touch targets as large as the existing tiles.
3. A widget in `apps/tablet/src/widgets/<Name>Widget.tsx` that connects a store to the component and translates
   texts with `t('…')`.
4. Place it in a page (`apps/tablet/src/pages/`). A new screen also needs: a `ViewId` in `stores/ui.store.ts`,
   an entry in `shell/tabs.ts` (with its "configured?" condition), the page in `shell/Shell.tsx`.
5. Texts: the same key in `apps/tablet/src/i18n/fr.ts` and `en.ts`. Plurals use `one|many` with `{n}`.

## The integration (`custom_components/paddock`)

- Keep it small: it serves `paddock.yaml` and handles the account switch. Rules of the home do not go in Python.
- A new WebSocket command or service needs its texts in `strings.json` and `translations/en.json`, `fr.json`.
- Bump `version` in `manifest.json` when its behaviour changes. It only takes effect after a restart of
  Home Assistant — say so in your summary.
- Anything that grants access (tokens, accounts) must check the caller is an administrator and must never
  return a secret to a non-administrator beyond what `paddock/config` already serves.

## The desktop app (`apps/desktop`)

- It is a shell: no interface code. A desktop-only behaviour is a branch on `isDesktop`
  (`apps/tablet/src/desktop.ts`) or a small Rust command in `src-tauri/src/lib.rs` called from that file.
- New Rust commands validate their arguments (see `open_external`) and are added to `generate_handler!`.

## Before you say it is done

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm config:check --example
```

Then state plainly what you ran, what you could not check (for example anything that needs a real tablet or a
real Home Assistant), and whether Home Assistant needs a restart or the tablet a reload.

Check for leaks before committing:

```bash
git status --short            # nothing named *.local.*, paddock.yaml or .env should appear
git diff --cached | grep -n -E '([0-9]{1,3}\.){3}[0-9]{1,3}|eyJ[A-Za-z0-9_-]{20,}' || true
```

An address in the output must be an example one (`192.168.1.20`, `homeassistant.local`), never a real home's.
