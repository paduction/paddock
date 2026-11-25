# Accounts, security and access from outside

## What is where

- **The app** (`/local/paddock/…`) is readable by anyone on your network without signing in — like everything
  in Home Assistant's `www` folder. This is why it contains nothing about your home.
- **`paddock.yaml`** is only sent over Home Assistant's signed-in connection, by the Paddock integration.
  Any signed-in user can read all of it, administrator or not — including keys referenced with `!secret`
  (the RAWG key). Do not put anything there that a member of the household should not see.
- **Automations** (schedules and modes) can be created and changed by any signed-in screen, administrator or not.
  They can only act on the devices listed in `paddock.yaml`, and can close the gate but never open it.
- **The token** typed on a tablet or in the desktop app is stored on that device only (browser storage).
  Someone holding the unlocked device has the rights of that account.

## One account per screen, without administrator rights

A wall tablet is in a corridor: give it an account that cannot change Home Assistant.

1. Home Assistant → **Settings → People → Users → Add user**. Name it for the screen (e.g. *Tablet*),
   leave **Administrator** off.
2. Sign in as that user once (a private browser window is fine), open its profile → **Security** →
   **Long-lived access tokens** → create one.
3. Use that token on the tablet.

### Moving the tablet to its own account, from a distance

If the tablet is already signed in with an administrator's token, you do not need to touch it.
From anywhere, as an administrator, call:

```yaml
action: paddock.assign_account
data:
  user: Tablet
```

The tablet notices, asks Home Assistant for a token for that user, stores it and reloads. Rules:

- only an administrator can call the service, and the target user must not be an administrator;
- only a device currently signed in as an administrator can claim the token, once, within 10 minutes;
- the token is long-lived (10 years) and appears in that user's profile, where you can revoke it.

Afterwards, delete the administrator token the tablet was using (your profile → Security).
The desktop app ignores this service: a computer keeps the account you signed it in with.

## Access from outside your home

**Do not forward a port of your router to Home Assistant** to use Paddock from outside: that exposes it to the
whole internet.

Use a private network instead. With [Tailscale](https://tailscale.com) (free for personal use):

1. Install the **Tailscale** app in Home Assistant and sign in.
2. In its configuration, advertise your home network as a subnet route (e.g. `192.168.1.0/24`).
3. In the Tailscale admin console, approve that route for the Home Assistant machine and disable key expiry for it.
4. Install Tailscale on your phone or laptop and sign in with the same account.

Your devices then reach Home Assistant at its usual home address from anywhere, with nothing open to the internet.
Home Assistant Cloud (Nabu Casa) also works: use its address in Paddock's setup screen.

## If a device is lost

Home Assistant → the profile of the account that device used → **Security** → delete its token.
If it was on Tailscale, remove it in the Tailscale admin console too.
