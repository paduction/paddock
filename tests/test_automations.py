"""The integration inside a real (test) Home Assistant: storage, timers, websocket commands."""

from datetime import datetime
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed, async_mock_service

from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .test_automations_model import CONFIG

PUMP = {"name": "Pool pump", "icon": "valve", "trigger": {"type": "time", "at": "06:00", "end": "08:00"}, "actions": [{"entity": "switch.pool_pump", "do": "on"}]}
LEAVING = {
    "name": "Leaving",
    "trigger": {"type": "manual"},
    "actions": [{"entity": "cover.living_room", "do": "close"}, {"entity": "cover.bedroom", "do": "position", "value": 20}],
}


@pytest.fixture
async def paddock(hass: HomeAssistant):
    """Paddock set up with the fictional home as paddock.yaml."""
    hass.states.async_set("person.alex", "home")
    hass.states.async_set("person.sam", "not_home")
    with patch("custom_components.paddock._read", return_value=CONFIG):
        entry = MockConfigEntry(domain="paddock")
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        yield entry


async def save(client, item):
    await client.send_json_auto_id({"type": "paddock/automations/save", "item": item})
    return await client.receive_json()


async def test_subscribe_save_and_delete(hass, hass_ws_client, paddock):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "paddock/automations/subscribe"})
    assert (await client.receive_json())["success"]
    assert (await client.receive_json())["event"] == {"items": []}

    # every change is pushed to the subscribers, next to the answer of the command
    await client.send_json_auto_id({"type": "paddock/automations/save", "item": PUMP})
    messages = [await client.receive_json(), await client.receive_json()]
    saved = next(m["result"] for m in messages if "result" in m)
    assert saved["trigger"] == {"type": "time", "at": "06:00", "end": "08:00"}
    assert next(m["event"] for m in messages if "event" in m) == {"items": [saved]}

    await client.send_json_auto_id({"type": "paddock/automations/delete", "automation": saved["id"]})
    messages = [await client.receive_json(), await client.receive_json()]
    assert {"items": []} in [m.get("event") for m in messages]


async def test_a_device_outside_paddock_yaml_is_refused(hass, hass_ws_client, paddock):
    client = await hass_ws_client(hass)
    answer = await save(client, {**PUMP, "actions": [{"entity": "lock.front_door", "do": "on"}]})
    assert not answer["success"]
    assert answer["error"] == {"code": "invalid_automation", "message": "device"}


async def test_a_tablet_without_administrator_rights_can_run_a_mode(hass, hass_ws_client, hass_admin_user, paddock):
    hass_admin_user.groups = [await hass.auth.async_get_group(GROUP_ID_USER)]
    assert not hass_admin_user.is_admin
    close = async_mock_service(hass, "cover", "close_cover")
    position = async_mock_service(hass, "cover", "set_cover_position")
    client = await hass_ws_client(hass)
    saved = (await save(client, LEAVING))["result"]

    await client.send_json_auto_id({"type": "paddock/automations/run", "automation": saved["id"]})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()

    assert close[0].data == {"entity_id": ["cover.living_room"]}
    assert position[0].data == {"entity_id": "cover.bedroom", "position": 20}
    assert "last_run" in hass.data["paddock"]["automations"].items[0]


async def test_time_range_switches_on_then_off(hass, hass_ws_client, paddock, freezer):
    on = async_mock_service(hass, "homeassistant", "turn_on")
    off = async_mock_service(hass, "homeassistant", "turn_off")
    client = await hass_ws_client(hass)
    freezer.move_to(datetime(2026, 6, 1, 5, 59, 30, tzinfo=dt_util.DEFAULT_TIME_ZONE))
    await save(client, PUMP)

    for clock, expected in (((6, 0), (1, 0)), ((7, 0), (1, 0)), ((8, 0), (1, 1))):
        moment = datetime(2026, 6, 1, *clock, 0, tzinfo=dt_util.DEFAULT_TIME_ZONE)
        freezer.move_to(moment)
        async_fire_time_changed(hass, moment)
        await hass.async_block_till_done()
        assert (len(on), len(off)) == expected
    assert on[0].data == off[0].data == {"entity_id": ["switch.pool_pump"]}


async def test_days_and_switched_off_automations_do_not_run(hass, hass_ws_client, paddock, freezer):
    on = async_mock_service(hass, "homeassistant", "turn_on")
    client = await hass_ws_client(hass)
    monday = datetime(2026, 6, 1, 6, 0, 0, tzinfo=dt_util.DEFAULT_TIME_ZONE)
    freezer.move_to(monday.replace(hour=5))
    await save(client, {**PUMP, "trigger": {"type": "time", "at": "06:00", "days": [5, 6]}})
    await save(client, {**PUMP, "name": "Paused", "enabled": False})

    freezer.move_to(monday)
    async_fire_time_changed(hass, monday)
    await hass.async_block_till_done()
    assert on == []

    saturday = monday.replace(day=6)
    freezer.move_to(saturday)
    async_fire_time_changed(hass, saturday)
    await hass.async_block_till_done()
    assert len(on) == 1


async def test_everyone_left_and_someone_arrived(hass, hass_ws_client, paddock):
    close = async_mock_service(hass, "cover", "close_cover")
    opened = async_mock_service(hass, "cover", "open_cover")
    client = await hass_ws_client(hass)
    await save(client, {"name": "Leaving", "trigger": {"type": "presence", "event": "everyone_left"}, "actions": [{"entity": "cover.living_room", "do": "close"}]})
    await save(client, {"name": "Back", "trigger": {"type": "presence", "event": "someone_arrived"}, "actions": [{"entity": "cover.living_room", "do": "open"}]})

    hass.states.async_set("person.sam", "home")      # two at home: nothing
    await hass.async_block_till_done()
    hass.states.async_set("person.alex", "not_home")  # one left: nothing
    await hass.async_block_till_done()
    assert (len(close), len(opened)) == (0, 0)

    hass.states.async_set("person.sam", "not_home")   # the last one leaves
    await hass.async_block_till_done()
    assert (len(close), len(opened)) == (1, 0)

    hass.states.async_set("person.alex", "home")      # the first one comes back
    await hass.async_block_till_done()
    assert (len(close), len(opened)) == (1, 1)


async def test_sunset_with_offset(hass, hass_ws_client, paddock, freezer):
    hass.config.latitude, hass.config.longitude = 48.85, 2.35
    close = async_mock_service(hass, "cover", "close_cover")
    client = await hass_ws_client(hass)
    freezer.move_to(datetime(2026, 6, 1, 12, 0, 0, tzinfo=dt_util.UTC))
    await save(client, {"name": "Evening", "trigger": {"type": "sun", "event": "sunset", "offset": 20}, "actions": [{"entity": "cover.bedroom", "do": "close"}]})

    from homeassistant.helpers.sun import get_astral_event_next

    sunset = get_astral_event_next(hass, "sunset", dt_util.utcnow())
    for minutes, expected in ((10, 0), (20, 1)):
        moment = sunset.replace(microsecond=0) + dt_util.dt.timedelta(minutes=minutes, seconds=1)
        freezer.move_to(moment)
        async_fire_time_changed(hass, moment)
        await hass.async_block_till_done()
        assert len(close) == expected


async def test_automations_survive_a_restart(hass, hass_ws_client, paddock, hass_storage):
    saved = (await save(await hass_ws_client(hass), PUMP))["result"]
    manager = hass.data["paddock"]["automations"]
    await manager._store.async_save({"items": manager.items})
    assert hass_storage["paddock.automations"]["data"]["items"][0]["id"] == saved["id"]

    assert await hass.config_entries.async_unload(paddock.entry_id)
    with patch("custom_components.paddock._read", return_value=CONFIG):
        assert await hass.config_entries.async_setup(paddock.entry_id)
    assert [i["name"] for i in hass.data["paddock"]["automations"].items] == ["Pool pump"]
