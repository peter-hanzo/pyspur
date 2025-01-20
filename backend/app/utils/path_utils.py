from pathlib import Path
import os

# Get the project root directory (where the backend directory is located)
PROJECT_ROOT = Path(os.getenv('PROJECT_ROOT', '/pyspur'))

def get_test_files_dir() -> Path:
    """Get the directory for test file uploads."""
    test_files_dir = PROJECT_ROOT / "data" / "test_files"
    test_files_dir.mkdir(parents=True, exist_ok=True)
    return test_files_dir

def resolve_file_path(file_path: str) -> Path:
    """
    Resolve a file path relative to the project root.
    Expects paths in format 'S9/20250120_121759_aialy.pdf' and resolves them to
    '/pyspur/backend/data/test_files/S9/20250120_121759_aialy.pdf'
    """
    path = Path(file_path)
    if path.is_absolute():
        return path

    # Construct full path under test_files directory
    full_path = PROJECT_ROOT / "backend" / "data" / "test_files" / path

    if not full_path.exists():
        raise FileNotFoundError(f"File not found at expected location: {full_path}")

    return full_path