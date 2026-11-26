**What this changes, and why**

**How it was checked**

- [ ] `pnpm typecheck && pnpm test && pnpm build && pnpm config:check --example`
- [ ] `pytest` (only when `custom_components/paddock` changed)
- [ ] New texts are in `fr.ts` and `en.ts`
- [ ] A new setting is in `schema.ts`, `validate.ts`, the example configuration and both `configuration.md`
- [ ] Nothing about a real home (entity ids, names, addresses, keys) is in the diff
