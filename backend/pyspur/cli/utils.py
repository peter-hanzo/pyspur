"""Utility functions for the PySpur CLI."""

from pathlib import Path
import shutil

from rich import print
import typer
from dotenv import load_dotenv
from sqlalchemy import text
from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext


def copy_template_file(template_name: str, dest_path: Path) -> None:
    """Copy a template file from the package templates directory to the destination."""
    template_dir = Path(__file__).parent.parent / "templates"
    template_path = template_dir / template_name

    if not template_path.exists():
        raise FileNotFoundError(f"Template file {template_name} not found")

    shutil.copy2(template_path, dest_path)


def load_environment() -> None:
    """Load environment variables from .env file with fallback to .env.example."""
    env_path = Path.cwd() / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print("[green]✓[/green] Loaded configuration from .env")
    else:
        template_dir = Path(__file__).parent.parent / "templates"
        example_env_path = template_dir / ".env.example"
        if example_env_path.exists():
            load_dotenv(example_env_path)
            print(
                "[yellow]![/yellow] No .env file found, using default configuration from .env.example"
            )
            print("[yellow]![/yellow] Run 'pyspur init' to create a customizable .env file")
        else:
            print("[red]✗[/red] No configuration files found")
            raise typer.Exit(1)


def run_migrations() -> None:
    """Run database migrations using SQLAlchemy."""
    try:
        from ..database import engine, database_url

        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("[green]✓[/green] Connected to database")

            # Get migration context
            context = MigrationContext.configure(conn)

            # Get current revision
            current_rev = context.get_current_revision()

            if current_rev is None:
                print("[yellow]![/yellow] No previous migrations found, initializing database")
            else:
                print(f"[green]✓[/green] Current database version: {current_rev}")

            # Get migration scripts directory from package
            script_location = Path(__file__).parent.parent / "models" / "management" / "alembic"
            if not script_location.exists():
                raise FileNotFoundError("Migration scripts not found in package")

            # Create Alembic config programmatically
            config = Config()
            config.set_main_option("script_location", str(script_location))
            config.set_main_option("sqlalchemy.url", database_url)

            # Run upgrade to head
            command.upgrade(config, "head")
            print("[green]✓[/green] Database schema is up to date")

    except Exception as e:
        print(f"[red]Error running migrations: {str(e)}[/red]")
        raise typer.Exit(1)
