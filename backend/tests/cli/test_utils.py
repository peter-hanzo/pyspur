"""Tests for the utils.py module in the PySpur CLI."""

import os
import tempfile
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from pyspur.cli.utils import copy_template_file, load_environment


@pytest.fixture
def mock_template_file() -> Generator[Path, None, None]:
    """Create a temp file to use as a template."""
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as temp:
        temp.write("template content")
        temp.flush()
        yield Path(temp.name)
        # Clean up
        os.unlink(temp.name)


def test_copy_template_file(mock_template_file: Path, tmp_path: Path) -> None:
    """Test copying a template file to a destination."""
    dest_path: Path = tmp_path / "destination.txt"

    # Mock the resources functionality
    mock_resources = MagicMock()
    mock_file_context = MagicMock()
    mock_resources.files.return_value = mock_file_context
    mock_file_context.joinpath.return_value = mock_template_file

    with patch("pyspur.cli.utils.resources", mock_resources):
        copy_template_file("test_template.txt", dest_path)

        # Verify the file was copied
        assert dest_path.exists()
        with open(dest_path, "r") as f:
            assert f.read() == "template content"


def test_load_environment_with_env_file(tmp_path: Path) -> None:
    """Test loading environment variables from .env file."""
    # Create a mock .env file
    env_path = tmp_path / ".env"
    with open(env_path, "w") as f:
        f.write("TEST_VAR=test_value")

    with (
        patch("pyspur.cli.utils.Path.cwd", return_value=tmp_path),
        patch("pyspur.cli.utils.load_dotenv") as mock_load_dotenv,
        patch("pyspur.cli.utils.print") as mock_print,
    ):
        load_environment()

        # Verify that load_dotenv was called with the .env file
        mock_load_dotenv.assert_called_once_with(env_path)

        # Verify the success message was printed
        mock_print.assert_called_with("[green]✓[/green] Loaded configuration from .env")
