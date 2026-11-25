"""Automations: the rules, with nothing from Home Assistant in here (so they can be tested alone).

An automation is plain data, written by the Paddock interface and kept by the integration:

    {
      "id": "…", "name": "Pool pump", "icon": "valve", "enabled": true,
      "trigger": {"type": "time", "at": "06:00", "end": "08:00", "days": [0, 1, 2, 3, 4]},
      "actions": [{"entity": "switch.pool_pump", "do": "on"}],
    }

Triggers
  manual    a button in the interface (a "mode": Leaving, Good night…)
  time      every day at `at`; with `end`, what was switched on is switched off then (and the reverse)
  sun       `offset` minutes after (or before, negative) sunrise / sunset
  presence  everyone_left: the last person leaves home · someone_arrived: the first person comes back
`days` (0 = Monday … 6 = Sunday) limits any of them to some days; absent or empty = every day.

Actions: on, off (lights, switches), open, close, position (shutters), scene.
The same shapes are described for the interface in packages/core/src/domain/automations.ts: change both.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

ENTITY_ID = re.compile(r"^[a-z_]+\.[a-z0-9_]+$")
CLOCK = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MAX_ACTIONS = 60
MAX_OFFSET = 180


class Invalid(ValueError):
    """What is wrong with an automation sent by the interface (short code, shown translated there)."""


def allowed_entities(config: dict[str, Any] | None) -> dict[str, set[str]]:
    """Entity id → what an automation may do with it. Only devices already listed in paddock.yaml.

    The gate can be closed by an automation, never opened: nothing opens the house on its own.
    """
    config = config or {}
    out: dict[str, set[str]] = {}

    def add(entity: Any, *actions: str) -> None:
        if isinstance(entity, str) and ENTITY_ID.match(entity):
            out.setdefault(entity, set()).update(actions)

    def items(value: Any) -> list[dict[str, Any]]:
        return [v for v in value if isinstance(v, dict)] if isinstance(value, list) else []

    def block(value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    lighting = block(config.get("lighting"))
    for light in items(lighting.get("lights")):
        add(light.get("entity"), "on", "off")
    for scene in items(lighting.get("scenes")):
        add(scene.get("entity"), "scene")
    for cover in items(config.get("covers")):
        add(cover.get("entity"), "open", "close", "position")
    outdoor = block(config.get("outdoor"))
    add(block(outdoor.get("poolDevice")).get("entity"), "on", "off")
    for device in items(outdoor.get("devices")):
        add(device.get("entity"), "on", "off")
    home = block(config.get("home"))
    add(block(home.get("cinema")).get("amplifier"), "on", "off")
    gate = block(home.get("gate")).get("entity")
    if isinstance(gate, str):
        out.pop(gate, None)
        add(gate, "close")
    return out


def people(config: dict[str, Any] | None) -> list[str]:
    """Person entities of paddock.yaml (who counts for "everyone left")."""
    listed = (config or {}).get("people")
    if not isinstance(listed, list):
        return []
    return [p["entity"] for p in listed if isinstance(p, dict) and isinstance(p.get("entity"), str)]


def _days(value: Any) -> list[int]:
    if value in (None, []):
        return []
    if not isinstance(value, list) or any(not isinstance(d, int) or isinstance(d, bool) or not 0 <= d <= 6 for d in value):
        raise Invalid("days")
    return sorted(set(value))


def _trigger(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise Invalid("trigger")
    kind = value.get("type")
    if kind == "manual":
        return {"type": "manual"}
    out: dict[str, Any] = {"type": kind}
    if kind == "time":
        at, end = value.get("at"), value.get("end")
        if not isinstance(at, str) or not CLOCK.match(at):
            raise Invalid("time")
        out["at"] = at
        if end not in (None, ""):
            if not isinstance(end, str) or not CLOCK.match(end) or end == at:
                raise Invalid("end")
            out["end"] = end
    elif kind == "sun":
        offset = value.get("offset", 0)
        if value.get("event") not in ("sunrise", "sunset"):
            raise Invalid("trigger")
        if not isinstance(offset, int) or isinstance(offset, bool) or abs(offset) > MAX_OFFSET:
            raise Invalid("offset")
        out.update(event=value["event"], offset=offset)
    elif kind == "presence":
        if value.get("event") not in ("everyone_left", "someone_arrived"):
            raise Invalid("trigger")
        out["event"] = value["event"]
    else:
        raise Invalid("trigger")
    days = _days(value.get("days"))
    if days:
        out["days"] = days
    return out


def _action(value: Any, allowed: dict[str, set[str]]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise Invalid("action")
    entity, do = value.get("entity"), value.get("do")
    if not isinstance(entity, str) or do not in allowed.get(entity, ()):
        raise Invalid("device")
    out: dict[str, Any] = {"entity": entity, "do": do}
    if do == "position":
        position = value.get("value")
        if not isinstance(position, int) or isinstance(position, bool) or not 0 <= position <= 100:
            raise Invalid("position")
        out["value"] = position
    return out


def clean(item: Any, allowed: dict[str, set[str]]) -> dict[str, Any]:
    """An automation as it will be kept: checked, with nothing but the known fields. Raises Invalid."""
    if not isinstance(item, dict):
        raise Invalid("automation")
    name = item.get("name")
    if not isinstance(name, str) or not name.strip() or len(name) > 60:
        raise Invalid("name")
    icon = item.get("icon") if isinstance(item.get("icon"), str) and re.match(r"^[a-z0-9_]{1,40}$", item["icon"]) else "bolt"
    actions = item.get("actions")
    if not isinstance(actions, list) or not actions or len(actions) > MAX_ACTIONS:
        raise Invalid("actions")
    cleaned = [_action(a, allowed) for a in actions]
    if len({a["entity"] for a in cleaned}) != len(cleaned):
        raise Invalid("actions")
    identifier = item.get("id")
    return {
        "id": identifier if isinstance(identifier, str) and re.match(r"^[a-f0-9]{8,32}$", identifier) else uuid.uuid4().hex[:12],
        "name": name.strip(),
        "icon": icon,
        "enabled": item.get("enabled") is not False,
        "trigger": _trigger(item.get("trigger")),
        "actions": cleaned,
    }


Call = tuple[str, str, dict[str, Any]]


def service_calls(actions: list[dict[str, Any]], allowed: dict[str, set[str]], reverse: bool = False) -> list[Call]:
    """Home Assistant service calls for the actions still allowed today.

    reverse: the end of a time range — what was switched on goes off and the reverse; shutters and scenes are left alone.
    """
    groups: dict[tuple[str, str], list[str]] = {}
    out: list[Call] = []
    for action in actions:
        entity, do = action["entity"], action["do"]
        if do not in allowed.get(entity, ()):
            continue
        if reverse:
            if do not in ("on", "off"):
                continue
            do = "off" if do == "on" else "on"
        if do == "position":
            out.append(("cover", "set_cover_position", {"entity_id": entity, "position": action["value"]}))
            continue
        service = {
            "on": ("homeassistant", "turn_on"),
            "off": ("homeassistant", "turn_off"),
            "open": ("cover", "open_cover"),
            "close": ("cover", "close_cover"),
            "scene": ("scene", "turn_on"),
        }[do]
        groups.setdefault(service, []).append(entity)
    return [(domain, name, {"entity_id": entities}) for (domain, name), entities in groups.items()] + out


def runs_on(trigger: dict[str, Any], weekday: int) -> bool:
    """Is this trigger active on that day (0 = Monday)?"""
    days = trigger.get("days")
    return not days or weekday in days


def presence_event(home_before: int, home_now: int) -> str | None:
    """What a change in the number of people at home means."""
    if home_before > 0 and home_now == 0:
        return "everyone_left"
    if home_before == 0 and home_now > 0:
        return "someone_arrived"
    return None
