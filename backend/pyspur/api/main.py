from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .api_app import api_app

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API routes under /api
app.mount("/api", api_app, name="api")

# Mount static files to serve frontend
static_dir = Path(__file__).parent.parent.joinpath("static")

# Optionally, mount directories for assets that you want served directly:
if Path.joinpath(static_dir, "images").exists():
    app.mount("/images", StaticFiles(directory=str(static_dir.joinpath("images"))), name="images")
if Path.joinpath(static_dir, "_next").exists():
    app.mount("/_next", StaticFiles(directory=str(static_dir.joinpath("_next"))), name="_next")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    # If the request is empty, serve index.html
    if full_path == "":
        return FileResponse(static_dir.joinpath("index.html"))

    # remove trailing slash
    if full_path[-1] == "/":
        full_path = full_path[:-1]

    # Build a candidate file path from the request.
    candidate = static_dir.joinpath(full_path)

    # If candidate is a directory, try its index.html.
    if candidate.is_dir():
        candidate_index = candidate.joinpath("index.html")
        if candidate_index.exists():
            return FileResponse(candidate_index)

    # If no direct file, try appending ".html" (for files like dashboard.html)
    candidate_html = static_dir.joinpath(full_path + ".html")
    if candidate_html.exists():
        return FileResponse(candidate_html)

    # If a file exists at that candidate, serve it.
    if candidate.exists():
        return FileResponse(candidate)

    # Check if the parent directory contains a file named "[id].html"
    parts = full_path.split("/")
    if len(parts) >= 2:
        parent = static_dir.joinpath(*parts[:-1])
        dynamic_file = parent.joinpath("[id].html")
        if dynamic_file.exists():
            return FileResponse(dynamic_file)

    # Fallback: serve the main index.html for client‑side routing.
    return FileResponse(static_dir.joinpath("index.html"))
