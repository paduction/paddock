"""Automations: kept in Home Assistant, run by Home Assistant, edited from the Paddock interface.

They live in this integration (not as Home Assistant automations) so that a wall tablet signed in
without administrator rights can create them, and so that they only ever touch the devices of paddock.yaml.
The rules are in automations_model.py; this file is the plumbing: storage, timers, websocket commands.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
import logging
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_sunrise,
    async_track_sunset,
    async_track_time_change,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .automations_model import Invalid, allowed_entities, clean, people, presence_event, runs_on, service_calls
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
STORAGE_VERSION = 1


class Automations:
    """The automations of the home and their timers."""

    def __init__(self, hass: HomeAssistant, read_config: Callable[[], dict[str, Any]]) -> None:
        self.hass = hass
        self._read_config = read_config
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, f"{DOMAIN}.automations")
        self.items: list[dict[str, Any]] = []
        self._timers: list[CALLBACK_TYPE] = []
        self._listeners: set[Callable[[list[dict[str, Any]]], None]] = set()
        self._people: list[str] = []
        self._home = 0

    async def async_start(self) -> None:
        data = await self._store.async_load()
        self.items = list((data or {}).get("items", []))
        await self._schedule()

    @callback
    def async_stop(self) -> None:
        for cancel in self._timers:
            cancel()
        self._timers = []

    async def _config(self) -> dict[str, Any]:
        """paddock.yaml as it is now; no settings (or a broken file) means nothing is allowed."""
        try:
            return await self.hass.async_add_executor_job(self._read_config)
        except Exception:  # noqa: BLE001 - missing or invalid file: automations simply do nothing
            return {}

    # ---------- what the interface asks ----------

    async def async_save(self, item: Any) -> dict[str, Any]:
        cleaned = clean(item, allowed_entities(await self._config()))
        previous = next((i for i in self.items if i["id"] == cleaned["id"]), None)
        if previous and "last_run" in previous:
            cleaned["last_run"] = previous["last_run"]
        self.items = [i for i in self.items if i["id"] != cleaned["id"]] + [cleaned]
        await self._changed(reschedule=True)
        return cleaned

    async def async_delete(self, identifier: str) -> None:
        self.items = [i for i in self.items if i["id"] != identifier]
        await self._changed(reschedule=True)

    async def async_run(self, identifier: str) -> bool:
        item = next((i for i in self.items if i["id"] == identifier), None)
        if item is None:
            return False
        await self._run(item)
        return True

    @callback
    def async_listen(self, listener: Callable[[list[dict[str, Any]]], None]) -> CALLBACK_TYPE:
        self._listeners.add(listener)
        return lambda: self._listeners.discard(listener)

    # ---------- running ----------

    async def _run(self, item: dict[str, Any], reverse: bool = False) -> None:
        allowed = allowed_entities(await self._config())
        for domain, service, data in service_calls(item["actions"], allowed, reverse):
            try:
                await self.hass.services.async_call(domain, service, data, blocking=False)
            except Exception as err:  # noqa: BLE001 - one device failing must not stop the others
                _LOGGER.warning("Automation %s: %s.%s failed: %s", item["name"], domain, service, err)
        if not reverse:
            item["last_run"] = dt_util.utcnow().isoformat()
        await self._changed(reschedule=False)

    def _due(self, item: dict[str, Any]) -> bool:
        return item["enabled"] and runs_on(item["trigger"], dt_util.now().weekday())

    async def _changed(self, reschedule: bool) -> None:
        self._store.async_delay_save(lambda: {"items": self.items}, 1)
        if reschedule:
            await self._schedule()
        for listener in list(self._listeners):
            listener(self.items)

    async def _schedule(self) -> None:
        """Set every timer again from the current list (cheap: a home has a handful of automations)."""
        self.async_stop()
        config = await self._config()
        self._people = people(config)
        self._home = self._count_home()

        for item in self.items:
            trigger = item["trigger"]
            kind = trigger["type"]
            if kind == "time":
                self._at(item["id"], trigger["at"], reverse=False)
                if "end" in trigger:
                    self._at(item["id"], trigger["end"], reverse=True)
            elif kind == "sun":
                track = async_track_sunrise if trigger["event"] == "sunrise" else async_track_sunset
                self._timers.append(track(self.hass, self._fire(item["id"], False), timedelta(minutes=trigger["offset"])))

        if self._people and any(i["trigger"]["type"] == "presence" for i in self.items):
            self._timers.append(async_track_state_change_event(self.hass, self._people, self._presence_changed))

    def _at(self, identifier: str, clock: str, reverse: bool) -> None:
        hour, minute = (int(part) for part in clock.split(":"))
        fire = self._fire(identifier, reverse)

        @callback
        def on_time(_now: Any) -> None:
            fire()

        self._timers.append(async_track_time_change(self.hass, on_time, hour=hour, minute=minute, second=0))

    def _fire(self, identifier: str, reverse: bool) -> Callable[[], None]:
        @callback
        def fire() -> None:
            item = next((i for i in self.items if i["id"] == identifier), None)
            # the end of a range is not tied to the day: a range started on Friday evening ends on Saturday morning
            if item is not None and (self._due(item) if not reverse else item["enabled"]):
                self.hass.async_create_task(self._run(item, reverse))

        return fire

    def _count_home(self) -> int:
        return sum(1 for entity in self._people if (state := self.hass.states.get(entity)) is not None and state.state == "home")

    @callback
    def _presence_changed(self, _event: Event) -> None:
        before, self._home = self._home, self._count_home()
        happened = presence_event(before, self._home)
        if happened is None:
            return
        for item in self.items:
            if item["trigger"]["type"] == "presence" and item["trigger"]["event"] == happened and self._due(item):
                self.hass.async_create_task(self._run(item))


# ---------- websocket commands (any signed-in user: see the security page of the documentation) ----------
# `id` is the number of the websocket message itself: an automation is named by `automation`.


def _manager(hass: HomeAssistant) -> Automations:
    return hass.data[DOMAIN]["automations"]


@websocket_api.websocket_command({vol.Required("type"): "paddock/automations/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The list now, then again after every change (a run changes `last_run`)."""

    @callback
    def forward(items: list[dict[str, Any]]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"items": items}))

    connection.subscriptions[msg["id"]] = _manager(hass).async_listen(forward)
    connection.send_result(msg["id"])
    forward(_manager(hass).items)


@websocket_api.websocket_command({vol.Required("type"): "paddock/automations/save", vol.Required("item"): dict})
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    try:
        connection.send_result(msg["id"], await _manager(hass).async_save(msg["item"]))
    except Invalid as err:
        connection.send_error(msg["id"], "invalid_automation", str(err))


@websocket_api.websocket_command({vol.Required("type"): "paddock/automations/delete", vol.Required("automation"): str})
@websocket_api.async_response
async def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    await _manager(hass).async_delete(msg["automation"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "paddock/automations/run", vol.Required("automation"): str})
@websocket_api.async_response
async def ws_run(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if await _manager(hass).async_run(msg["automation"]):
        connection.send_result(msg["id"])
    else:
        connection.send_error(msg["id"], "not_found", "No such automation")


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    for command in (ws_subscribe, ws_save, ws_delete, ws_run):
        websocket_api.async_register_command(hass, command)
