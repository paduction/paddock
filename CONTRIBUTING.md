# Contributing to Paddock

Thank you for looking. Paddock is a personal project opened for others to use and adapt: issues, ideas and pull
requests are welcome, and answered when time allows.

## Before you start

- **A question about your own install** (an entity that does not show, a screen that stays hidden): read
  [docs/en/install.md](docs/en/install.md) and [docs/en/modules.md](docs/en/modules.md), run `pnpm config:check`,
  then open an issue with what the check printed.
- **A bug**: open an issue with the steps, what you expected and what happened.
- **A larger change** (a new screen, a new setting): open an issue first, so we agree on the shape before you write it.

## Never share your home

`paddock.yaml`, `tools/deploy.local.env` and anything named `*.local.*` describe your real home and hold your keys.
They are git-ignored on purpose. Do not paste them into an issue or a pull request: replace entity ids, names,
addresses and tokens with invented ones.

## Working on the code

[AGENTS.md](AGENTS.md) is the guide, for people as much as for assistants: the map of the repository, the layering
rule (`ui` never knows Home Assistant, `core/domain` never knows React), and what a new setting or a new text must touch.

Before you open a pull request:

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm config:check --example
pytest          # only when custom_components/paddock changed
```

- Code, comments and commit messages are in English. Interface texts exist in French and English, always both.
- The example configuration stays a fictional home with neutral names.
- Styling uses the tokens (`var(--pd-…)`) and CSS Modules.
- One subject per pull request, with a message that says why.

## Licence

By contributing you agree that your contribution is published under the [MIT licence](LICENSE).
