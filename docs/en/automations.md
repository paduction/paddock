# Automations: schedules and modes

The **Automations** tab lets you set the home up to act by itself, from the tablet or the desktop app,
without opening Home Assistant.

- A **mode** is a button that sets several devices at once. *Leaving*: close these shutters, leave those
  ajar, switch the lights off, close the garage door.
- A **schedule** runs by itself. *Pool pump*: on at 06:00, off at 08:00.

Everything is created and changed in the interface: press **+ Mode** or **+ Schedule**, give it a name,
say when it runs, then choose what each device does. A device you do not touch is left alone.

## When a schedule runs

| | |
|---|---|
| **Time** | At a set time. With an end time it becomes a range: what was switched on goes off at the end (and the reverse). Shutters and scenes do not move at the end. |
| **Sun** | At sunrise or sunset, or up to an hour before or after. |
| **Presence** | When the last person leaves home, or when the first one comes back. People are those listed under `people` in `paddock.yaml`. |

Each of them can be limited to some days of the week, and paused with its switch without being deleted.

## What devices can do

| Device | Choices |
|---|---|
| Lights, outdoor devices, the amplifier | Turn on, turn off |
| Shutters | Open, ajar (20 %), 50 %, close |
| Scenes | Activate |
| Gate or garage door | Close only |

Only devices already in `paddock.yaml` are offered. An automation can close the gate but never open it:
nothing opens the house on its own.

## Good to know

- Automations are kept and run by the Paddock integration inside Home Assistant: they work when the tablet
  is off, and every screen (tablet, desktop app) shows the same list.
- They are not Home Assistant automations and do not appear in its *Automations* page. Home Assistant's own
  automations keep working next to them.
- If Home Assistant is stopped at the time a schedule should run, that run is skipped.
- Any signed-in screen can create and change them: see [security.md](security.md).
- They need version 0.4.0 or later of the integration (restart Home Assistant after updating it).
