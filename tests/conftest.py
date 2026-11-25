"""Tests of the Home Assistant integration. Run from the repository root:

    pip install pytest-homeassistant-custom-component
    pytest tests
"""

import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Let Home Assistant load custom_components/paddock."""
    yield
