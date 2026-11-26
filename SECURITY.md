# Security

Paddock controls a home: a flaw can open a gate or show a camera. Reports are taken seriously.

## Reporting a vulnerability

Please do **not** open a public issue. Use **Security → Report a vulnerability** on this repository
(GitHub's private reporting), and include what is affected, how to reproduce it and what an attacker could do.
You will get an answer as soon as possible; this is a personal project, so allow a few days.

Never include a real token, password or `paddock.yaml` in a report.

## What to know about your own install

- The app itself contains nothing about a home. Everything specific lives in `paddock.yaml`, inside your
  Home Assistant, and is only given to signed-in devices.
- Give the tablet its own non-administrator account, and keep Home Assistant off the open internet.
  [docs/en/security.md](docs/en/security.md) explains accounts and access from outside.
- Only the latest version on `main` is maintained.
