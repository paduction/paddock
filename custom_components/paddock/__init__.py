"""Paddock: gives the wall tablet its configuration once it is signed in, and runs its automations.

The tablet app itself is static (www/paddock, readable without signing in).
Everything specific to the home (entity ids, rooms, keys) lives in paddock.yaml
and is only handed out over the authenticated websocket API.
"""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.auth.models import TOKEN_TYPE_LONG_LIVED_ACCESS_TOKEN, User
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError, Unauthorized
from homeassistant.util import dt as dt_util
from homeassistant.util.yaml import Secrets, load_yaml_dict

from .automations import Automations, async_register_commands
from .const import CONFIG_FILE, DOMAIN

EVENT_ACCOUNT_ASSIGNED = "paddock_account_assigned"
CLAIM_WINDOW = timedelta(minutes=10)
TOKEN_LIFESPAN = timedelta(days=3650)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Register the websocket commands and the service (once), then start the automations."""
    if not hass.data.get(DOMAIN):
        websocket_api.async_register_command(hass, ws_get_config)
        websocket_api.async_register_command(hass, ws_claim_account)
        async_register_commands(hass)
        hass.services.async_register(
            DOMAIN, "assign_account", _service_assign_account(hass), schema=vol.Schema({vol.Required("user"): str})
        )
        hass.data[DOMAIN] = {"pending": None}
    automations = Automations(hass, lambda: _read(hass.config.config_dir))
    hass.data[DOMAIN]["automations"] = automations
    await automations.async_start()
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """The commands stay registered until restart; the automations stop running."""
    hass.data[DOMAIN]["automations"].async_stop()
    return True


def _named_keys(value: Any) -> Any:
    """Give the keys `on` and `off` their names back.

    Home Assistant reads YAML 1.1, where a bare `on:` / `off:` key is the boolean true / false.
    Paddock uses them as setting names (projector.on, a device's `on` and `off` texts).
    """
    if isinstance(value, dict):
        return {("on" if k is True else "off" if k is False else k): _named_keys(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_named_keys(v) for v in value]
    return value


def _read(config_dir: str) -> dict[str, Any]:
    path = Path(config_dir) / CONFIG_FILE
    if not path.is_file():
        raise FileNotFoundError(CONFIG_FILE)
    return _named_keys(load_yaml_dict(path, Secrets(Path(config_dir))))


@websocket_api.websocket_command({vol.Required("type"): "paddock/config"})
@websocket_api.async_response
async def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return paddock.yaml (secrets resolved). Any signed-in user, admin or not."""
    try:
        data = await hass.async_add_executor_job(_read, hass.config.config_dir)
    except FileNotFoundError:
        connection.send_error(msg["id"], "not_found", f"{CONFIG_FILE} is missing next to configuration.yaml")
        return
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return
    connection.send_result(msg["id"], data)


# ---------- Remote account switch ----------
# A tablet set up with an administrator's token can be moved to a restricted account from a distance:
# an administrator calls paddock.assign_account (user = a non-admin user); the tablet, which listens
# while it runs as an administrator, claims a long-lived token for that user (once, within 10 minutes)
# and signs in again with it. Nobody has to touch the tablet.


async def _find_user(hass: HomeAssistant, name_or_id: str) -> User:
    wanted = name_or_id.strip().lower()
    for user in await hass.auth.async_get_users():
        if user.system_generated or not user.is_active:
            continue
        if user.id == name_or_id or (user.name or "").strip().lower() == wanted:
            return user
    raise ServiceValidationError(f"No active user named {name_or_id!r}")


def _service_assign_account(hass: HomeAssistant):
    async def handle(call: ServiceCall) -> None:
        if call.context.user_id:
            caller = await hass.auth.async_get_user(call.context.user_id)
            if caller is None or not caller.is_admin:
                raise Unauthorized()
        user = await _find_user(hass, call.data["user"])
        if user.is_admin:
            raise ServiceValidationError(
                f"{user.name} is an administrator: give the tablet an account without administrator rights"
            )
        hass.data[DOMAIN]["pending"] = (user.id, dt_util.utcnow() + CLAIM_WINDOW)
        hass.bus.async_fire(EVENT_ACCOUNT_ASSIGNED, {"user_name": user.name})

    return handle


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): "paddock/claim_account", vol.Optional("device", default="tablet"): str}
)
@websocket_api.async_response
async def ws_claim_account(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Mint a long-lived token for the assigned (non-admin) user. One claim per assignment."""
    pending = hass.data[DOMAIN].get("pending")
    hass.data[DOMAIN]["pending"] = None
    if not pending or pending[1] < dt_util.utcnow():
        connection.send_error(msg["id"], "no_assignment", "No account assigned in the last 10 minutes")
        return
    user = await hass.auth.async_get_user(pending[0])
    if user is None or not user.is_active or user.is_admin:
        connection.send_error(msg["id"], "invalid_user", "The assigned account is not usable")
        return
    stamp = dt_util.now().strftime("%Y-%m-%d %H:%M:%S")
    refresh_token = await hass.auth.async_create_refresh_token(
        user,
        client_name=f"Paddock {msg['device']} {stamp}",
        token_type=TOKEN_TYPE_LONG_LIVED_ACCESS_TOKEN,
        access_token_expiration=TOKEN_LIFESPAN,
    )
    token = hass.auth.async_create_access_token(refresh_token)
    connection.send_result(msg["id"], {"token": token, "user_name": user.name})
