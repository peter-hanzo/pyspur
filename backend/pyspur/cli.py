import shutil
from pathlib import Path
from typing import Optional

import typer
from rich import print
from rich.console import Console

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


def main() -> None:
    app()
