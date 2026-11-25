"""The rules of automations, without Home Assistant."""

import pytest

from custom_components.paddock.automations_model import Invalid, allowed_entities, clean, people, presence_event, runs_on, service_calls

CONFIG = {
    "home": {"gate": {"entity": "cover.garage_door"}, "cinema": {"amplifier": "switch.amplifier"}},
    "lighting": {"lights": [{"entity": "light.living_room"}], "scenes": [{"entity": "scene.relax"}]},
    "covers": [{"entity": "cover.living_room"}, {"entity": "cover.bedroom"}],
    "outdoor": {"poolDevice": {"entity": "switch.pool_pump"}, "devices": [{"entity": "switch.garden_lights"}]},
    "people": [{"name": "Alex", "entity": "person.alex"}, {"name": "Sam", "entity": "person.sam"}],
}
ALLOWED = allowed_entities(CONFIG)


def automation(**changes):
    return {"name": "Pool pump", "trigger": {"type": "time", "at": "06:00"}, "actions": [{"entity": "switch.pool_pump", "do": "on"}], **changes}


def test_only_devices_of_paddock_yaml_are_allowed():
    assert ALLOWED["switch.pool_pump"] == {"on", "off"}
    assert ALLOWED["cover.living_room"] == {"open", "close", "position"}
    assert ALLOWED["scene.relax"] == {"scene"}
    assert "lock.front_door" not in ALLOWED
    assert allowed_entities(None) == {}


def test_the_gate_can_be_closed_but_never_opened():
    assert ALLOWED["cover.garage_door"] == {"close"}
    with pytest.raises(Invalid, match="device"):
        clean(automation(actions=[{"entity": "cover.garage_door", "do": "open"}]), ALLOWED)


def test_clean_keeps_known_fields_and_gives_an_id():
    kept = clean(automation(extra="x", icon="valve"), ALLOWED)
    assert set(kept) == {"id", "name", "icon", "enabled", "trigger", "actions"}
    assert kept["enabled"] is True and kept["icon"] == "valve" and len(kept["id"]) == 12
    assert clean({**kept, "name": "Pump"}, ALLOWED)["id"] == kept["id"]


@pytest.mark.parametrize(
    ("changes", "code"),
    [
        ({"name": "  "}, "name"),
        ({"actions": []}, "actions"),
        ({"actions": [{"entity": "switch.unknown", "do": "on"}]}, "device"),
        ({"actions": [{"entity": "switch.pool_pump", "do": "open"}]}, "device"),
        ({"actions": [{"entity": "switch.pool_pump", "do": "on"}, {"entity": "switch.pool_pump", "do": "off"}]}, "actions"),
        ({"actions": [{"entity": "cover.bedroom", "do": "position", "value": 140}]}, "position"),
        ({"trigger": {"type": "time", "at": "6h"}}, "time"),
        ({"trigger": {"type": "time", "at": "06:00", "end": "06:00"}}, "end"),
        ({"trigger": {"type": "time", "at": "06:00", "days": [7]}}, "days"),
        ({"trigger": {"type": "sun", "event": "noon"}}, "trigger"),
        ({"trigger": {"type": "sun", "event": "sunset", "offset": 600}}, "offset"),
        ({"trigger": {"type": "presence", "event": "nobody"}}, "trigger"),
        ({"trigger": {"type": "webhook"}}, "trigger"),
    ],
)
def test_clean_refuses(changes, code):
    with pytest.raises(Invalid, match=code):
        clean(automation(**changes), ALLOWED)


def test_triggers_are_normalised():
    assert clean(automation(trigger={"type": "manual", "at": "x"}), ALLOWED)["trigger"] == {"type": "manual"}
    assert clean(automation(trigger={"type": "time", "at": "06:00", "end": "08:00", "days": [4, 0, 0]}), ALLOWED)["trigger"] == {
        "type": "time", "at": "06:00", "end": "08:00", "days": [0, 4],
    }
    assert clean(automation(trigger={"type": "sun", "event": "sunset", "offset": 20, "days": []}), ALLOWED)["trigger"] == {
        "type": "sun", "event": "sunset", "offset": 20,
    }


def test_leaving_mode_groups_the_calls():
    actions = [
        {"entity": "cover.living_room", "do": "close"},
        {"entity": "cover.bedroom", "do": "position", "value": 20},
        {"entity": "light.living_room", "do": "off"},
        {"entity": "switch.garden_lights", "do": "off"},
        {"entity": "cover.garage_door", "do": "close"},
    ]
    assert service_calls(actions, ALLOWED) == [
        ("cover", "close_cover", {"entity_id": ["cover.living_room", "cover.garage_door"]}),
        ("homeassistant", "turn_off", {"entity_id": ["light.living_room", "switch.garden_lights"]}),
        ("cover", "set_cover_position", {"entity_id": "cover.bedroom", "position": 20}),
    ]


def test_the_end_of_a_range_reverses_on_and_off_only():
    actions = [{"entity": "switch.pool_pump", "do": "on"}, {"entity": "cover.bedroom", "do": "close"}, {"entity": "scene.relax", "do": "scene"}]
    assert service_calls(actions, ALLOWED, reverse=True) == [("homeassistant", "turn_off", {"entity_id": ["switch.pool_pump"]})]


def test_a_device_removed_from_paddock_yaml_is_skipped_when_running():
    actions = [{"entity": "switch.pool_pump", "do": "on"}, {"entity": "switch.garden_lights", "do": "on"}]
    assert service_calls(actions, {"switch.garden_lights": {"on", "off"}}) == [("homeassistant", "turn_on", {"entity_id": ["switch.garden_lights"]})]


def test_days():
    assert runs_on({"type": "time", "at": "06:00"}, 6)
    assert runs_on({"type": "time", "at": "06:00", "days": [0, 1]}, 1)
    assert not runs_on({"type": "time", "at": "06:00", "days": [0, 1]}, 5)


def test_presence():
    assert people(CONFIG) == ["person.alex", "person.sam"]
    assert presence_event(1, 0) == "everyone_left"
    assert presence_event(0, 1) == "someone_arrived"
    assert presence_event(2, 1) is None and presence_event(1, 2) is None and presence_event(0, 0) is None
