# Setting up the wall tablet

Paddock is drawn for a landscape screen of 1280 × 800 and scales to any other landscape size.
Any tablet with a recent browser works; an inexpensive 10–11" Android tablet is enough.

## Android with Fully Kiosk Browser (recommended)

[Fully Kiosk Browser](https://www.fully-kiosk.com) turns the tablet into a display that stays on one page.
The paid licence removes the watermark and unlocks kiosk mode and remote control.

| Where in Fully's settings | Setting | Value |
|---|---|---|
| Web Content Settings | Start URL | `http://<your-home-assistant>:8123/local/paddock.html` |
| Web Content Settings | Autoplay Videos | on (camera streams) |
| Device Management | Keep Screen On | on |
| Device Management | Launch on Boot | on |
| Motion Detection | Enable Visual Motion Detection, Turn Screen On on Motion | on, if you let the screen switch off |
| Kiosk Mode | Enable Kiosk Mode | on, with a PIN |
| Remote Administration | Enable Remote Administration | on, with a password, if you use the Home Assistant integration |

Paddock has its own screensaver (a clock, after `idleMinutes` without a touch), so Fully's screensaver can stay off.

**Fully Kiosk Browser integration (optional).** Adding the tablet to Home Assistant with this integration lets
you reload the page, switch the screen and set the volume from Home Assistant. Reloading after a deploy:

```yaml
action: fully_kiosk.load_url
data:
  device_id: <your tablet>
  url: http://<your-home-assistant>:8123/local/paddock.html
```

## iPad or another browser

Open the same address in the browser and add it to the home screen. Use *Guided Access* (iPad) to keep it on Paddock.

## Signing the tablet in

At first launch Paddock asks for the address of Home Assistant and a long-lived token.
Typing a long token on a wall tablet is painful. The easy way: sign the tablet in once with any token you can
get onto it (copy it from a note or a message opened on the tablet), then give the tablet its own restricted
account from your computer, without touching it again: see **Moving the tablet to its own account** in
[security.md](security.md).

## After a power cut

The tablet often starts before Home Assistant. Paddock then shows the home from the last settings it saw
and reconnects by itself every 15 seconds.
