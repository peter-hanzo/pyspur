"""Utility functions for the PySpur CLI."""

from pathlib import Path
import shutil
from importlib import resources
import tempfile

from rich import print
import typer
from dotenv import load_dotenv
from sqlalchemy import text
from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext


def copy_template_file(template_name: str, dest_path: Path) -> None:
    """Copy a template file from the package templates directory to the destination."""
    with resources.files("pyspur.templates").joinpath(template_name).open("rb") as src:
        with open(dest_path, "wb") as dst:
            shutil.copyfileobj(src, dst)


def load_environment() -> None:
    """Load environment variables from .env file with fallback to .env.example."""
    env_path = Path.cwd() / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print("[green]✓[/green] Loaded configuration from .env")
    else:
        with resources.files("pyspur.templates").joinpath(".env.example").open() as f:
            load_dotenv(stream=f)
            print(
                "[yellow]![/yellow] No .env file found, using default configuration from .env.example"
            )
            print("[yellow]![/yellow] Run 'pyspur init' to create a customizable .env file")


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

            # Get migration scripts directory using importlib.resources
            script_location = resources.files("pyspur.models.management.alembic")
            if not script_location.is_dir():
                raise FileNotFoundError("Migration scripts not found in package")

            # extract migration scripts directory to a temporary location
            with (
                tempfile.TemporaryDirectory() as script_temp_dir,
                resources.as_file(script_location) as script_location_path,
            ):
                print("[yellow]![/yellow] Temporary migration directory: ", script_temp_dir)
                print("[yellow]![/yellow] Migration scripts location: ", script_location_path)
                shutil.copytree(script_location_path, Path(script_temp_dir), dirs_exist_ok=True)
                print("[green]✓[/green] Copied migration scripts to temporary directory")
                from rich.tree import Tree

                print("[yellow]![/yellow] Migration directory structure:")
                tree = Tree(script_temp_dir)
                for path in Path(script_temp_dir).rglob("*"):
                    if path.is_file():
                        tree.add(str(path.relative_to(script_temp_dir)))
                print(tree)
                # Create Alembic config programmatically
                config = Config()
                config.set_main_option("script_location", str(script_temp_dir))
                config.set_main_option("sqlalchemy.url", database_url)

                # Add SQLite-specific configuration
                if database_url.startswith("sqlite"):
                    config.set_section_option("alembic", "use_batch_alter", "True")

                    # Add SQLite-specific compiler for column comments
                    from sqlalchemy.ext.compiler import compiles
                    from alembic.ddl.base import ColumnComment

                    @compiles(ColumnComment, "sqlite")
                    def compile_column_comment(element, compiler, **kw):  # type: ignore
                        # SQLite does not support column comments.
                        return ""

                # Run upgrade to head
                command.upgrade(config, "head", sql=True)
                print("[green]✓[/green] Database schema is up to date")

    except Exception as e:
        print(f"[red]Error running migrations: {str(e)}[/red]")
        raise typer.Exit(1)
