"""Config flow: one click, nothing to fill in (the settings live in paddock.yaml)."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class PaddockConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add Paddock."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="Paddock", data={})
        return self.async_show_form(step_id="user")
