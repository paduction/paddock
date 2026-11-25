# Installing Paddock

Paddock has three parts:

| Part | Where it goes | What it does |
|---|---|---|
| The app | `/config/www/paddock/` in Home Assistant | The interface the tablet opens. Contains nothing about your home. |
| The integration | `/config/custom_components/paddock/` | Gives `paddock.yaml` to devices that are signed in. |
| `paddock.yaml` | `/config/paddock.yaml`, next to `configuration.yaml` | Your home: which entities appear where. |

You need a working Home Assistant, and on your computer [Node 22 or newer](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/paduction/paddock && cd paddock
pnpm install
```

## 1. Give the tools access to Home Assistant

```bash
cp tools/deploy.example.env tools/deploy.local.env
```

Fill in `tools/deploy.local.env` (it is git-ignored):

- `HA_URL` and `HA_TOKEN` — used by `pnpm discover` and `pnpm config:check`, which only read.
  Create the token in Home Assistant: your profile (bottom left) → **Security** → **Long-lived access tokens**.
- `HA_HOST`, `HA_PORT`, `HA_KEY` — used by `pnpm run deploy` to copy files over SSH.
  Install the **Terminal & SSH** app in Home Assistant and put your public key in its configuration.
  No SSH? Skip these and use the manual install below.

## 2. Write paddock.yaml

Let Paddock look at what you have:

```bash
pnpm discover --draft
```

This writes:

- `paddock.yaml` — a first version built from your lights, shutters, people, calendars, cameras…
- `paddock.discovery.local.md` — every entity Paddock can use, sorted by setting, with names and areas.

Now edit `paddock.yaml`: remove what you do not want on the wall, rename, choose icons
(names from [Material Symbols](https://fonts.google.com/icons), e.g. `table_lamp`).
The cinema, films, games, energy and outdoor screens are not guessed: copy those parts from
`paddock.example.yaml` and replace the entity ids, using the discovery file to find them.

Every setting is described in [configuration.md](configuration.md); what each screen needs in Home Assistant
is in [modules.md](modules.md).

Check your work as often as you like:

```bash
pnpm config:check
```

It reports missing or mistyped settings, and entities that do not exist in your Home Assistant.

A key or password never goes in `paddock.yaml` itself: write `!secret some_name` and put the value in
Home Assistant's `secrets.yaml`.

## 3. Copy everything to Home Assistant

### With the deploy script

```bash
pnpm run deploy
```

It builds the app, checks `paddock.yaml`, then copies the app, the integration and `paddock.yaml`.

### By hand (Samba, File editor, Studio Code Server…)

```bash
pnpm build
```

Then copy:

- `apps/tablet/dist/index.html` and `apps/tablet/dist/assets/` → `/config/www/paddock/`
- `apps/tablet/dist/loader.html` → `/config/www/paddock.html`
- `custom_components/paddock/` → `/config/custom_components/paddock/`
- `paddock.yaml` → `/config/paddock.yaml`

The integration alone can also be installed with [HACS](https://hacs.xyz): add
`https://github.com/paduction/paddock` as a custom repository of type *Integration*.

## 4. Turn the integration on

1. Restart Home Assistant (needed once, and after each update of the integration).
2. **Settings → Devices & services → Add integration → Paddock**. There is nothing to fill in.

## 5. Open it

On the tablet, open `http://<your-home-assistant>:8123/local/paddock.html`.
Paddock asks for the address of Home Assistant and a long-lived token, once.
Use a token from an account that is **not** an administrator: see [security.md](security.md).

Then set the tablet up as a wall display: [tablet.md](tablet.md).

## Later

- **Changing a setting**: edit `paddock.yaml`, run `pnpm config:check`, then `pnpm run deploy` (or copy the file).
  Reload the page on the tablet. Home Assistant does not need a restart for `paddock.yaml`.
- **Updating Paddock**: `git pull`, `pnpm install`, `pnpm run deploy`. Restart Home Assistant if `custom_components/paddock` changed.
- **Seeing the setup screen again**: add `#settings` to the address.

## When something is wrong

| What you see | What to do |
|---|---|
| "Home Assistant has no settings for Paddock" | The integration is not added, or `/config/paddock.yaml` is missing. |
| "paddock.yaml has mistakes" followed by a list | Fix the listed settings; `pnpm config:check` shows the same list. |
| "The token was refused" | Create a new long-lived token and paste it again. |
| A tile stays empty or grey | Its entity id is wrong or the device is offline: `pnpm config:check`. |
| A tab is missing | That screen is not configured in `paddock.yaml`: see [modules.md](modules.md). |
