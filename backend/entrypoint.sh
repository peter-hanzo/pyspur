#!/bin/bash

# First test Ollama connection if URL is provided
if [ -f "test_ollama.sh" ]; then
    chmod +x test_ollama.sh
    ./test_ollama.sh
fi

set -e 
mkdir -p /pyspur/app/models/management/alembic/versions/versions
check_for_changes() {
    alembic check
}

create_revision_and_upgrade() {
    echo "New changes detected, creating revision and running upgrade."
    alembic revision --autogenerate -m "Auto-generated revision"
    alembic upgrade head
}

start_server() {
    uvicorn app.api.main:app --reload --host 0.0.0.0 --port 8000
}

main() {
    if check_for_changes; then
        echo "No changes detected, skipping revision creation and upgrade."
    else
        create_revision_and_upgrade
    fi
    start_server
}

main