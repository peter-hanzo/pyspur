"""Common test fixtures for PySpur backend tests."""

import pytest
from typer.testing import CliRunner


@pytest.fixture
def cli_runner():
    """Fixture for creating a CLI runner for testing Typer applications."""
    return CliRunner()
