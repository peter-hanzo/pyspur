import shutil
from pathlib import Path
from typing import Optional
import os

import typer
from rich import print
from rich.console import Console
import uvicorn
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext

app = typer.Typer(
    name="pyspur",
    help="PySpur CLI - A tool for building and deploying AI Agents",
    add_completion=False,
)

console = Console()


def copy_template_file(template_name: str, dest_path: Path) -> None:
    """Copy a template file from the package templates directory to the destination."""
    template_dir = Path(__file__).parent / "templates"
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
        template_dir = Path(__file__).parent / "templates"
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
        # Construct database URL from environment variables
        db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"

        # Create engine
        engine = create_engine(db_url)

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
            script_location = Path(__file__).parent / "models" / "management" / "alembic"
            if not script_location.exists():
                raise FileNotFoundError("Migration scripts not found in package")

            # Create Alembic config programmatically
            config = Config()
            config.set_main_option("script_location", str(script_location))
            config.set_main_option("sqlalchemy.url", db_url)

            # Run upgrade to head
            command.upgrade(config, "head")
            print("[green]✓[/green] Database schema is up to date")

    except Exception as e:
        print(f"[red]Error running migrations: {str(e)}[/red]")
        raise typer.Exit(1)


@app.command()
def init(
    path: Optional[str] = typer.Argument(
        None,
        help="Path where to initialize PySpur project. Defaults to current directory.",
    )
) -> None:
    """Initialize a new PySpur project in the specified directory."""
    target_dir = Path(path) if path else Path.cwd()

    if not target_dir.exists():
        target_dir.mkdir(parents=True)

    # Copy .env.example
    try:
        copy_template_file(".env.example", target_dir / ".env.example")
        print("[green]✓[/green] Created .env.example")

        # Create .env if it doesn't exist
        env_path = target_dir / ".env"
        if not env_path.exists():
            shutil.copy2(target_dir / ".env.example", env_path)
            print("[green]✓[/green] Created .env from template")

        print("\n[bold green]PySpur project initialized successfully! 🚀[/bold green]")
        print("\nNext steps:")
        print("1. Review and update the .env file with your configuration")
        print("2. Visit https://docs.pyspur.dev to learn more about PySpur")

    except Exception as e:
        print(f"[red]Error initializing project: {str(e)}[/red]")
        raise typer.Exit(1)


@app.command()
def serve(
    host: str = typer.Option(
        None,
        help="Host to bind the server to. Defaults to PYSPUR_HOST from environment or 0.0.0.0",
    ),
    port: int = typer.Option(
        None,
        help="Port to bind the server to. Defaults to PYSPUR_PORT from environment or 6080",
    ),
) -> None:
    """Start the PySpur server."""
    try:
        # Load environment variables
        load_environment()

        # Use environment variables as defaults if not provided via CLI
        host = host or os.getenv("PYSPUR_HOST", "0.0.0.0")
        port = port or int(os.getenv("PYSPUR_PORT", "6080"))

        # Run database migrations
        print("[yellow]Running database migrations...[/yellow]")
        run_migrations()

        # Start the server
        print(f"\n[green]Starting PySpur server at http://{host}:{port} 🚀[/green]")
        uvicorn.run(
            "pyspur.api.main:app",
            host=host,
            port=port,
        )

    except Exception as e:
        print(f"[red]Error starting server: {str(e)}[/red]")
        raise typer.Exit(1)


def main() -> None:
    app()
