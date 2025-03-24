#!/usr/bin/env python

"""Repair Socket Mode Workers

This script helps diagnose and repair socket mode worker issues.
It can:
1. List all socket mode workers
2. Clean up stale marker files
3. Restart workers
4. Fix database state to match reality

Usage:
python repair_socket_workers.py [--clean] [--restart] [--fix-db]

"""

import argparse
import os
import sys
from pathlib import Path

# Add the parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    from pyspur.api.slack_management import recover_orphaned_workers
    from pyspur.database import get_db
    from pyspur.integrations.slack.worker_status import (
        MARKER_DIR,
        find_running_worker_process,
        get_worker_status,
        list_workers,
    )
    from pyspur.models.slack_agent_model import SlackAgentModel

    # Try to import psutil
    try:
        import psutil

        PSUTIL_AVAILABLE = True
    except ImportError:
        PSUTIL_AVAILABLE = False
        print("Warning: psutil not available, some features will be limited")
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print(
        "Make sure to run this script from the project root or add the project root to PYTHONPATH"
    )
    sys.exit(1)


def list_all_workers() -> None:
    """List all socket mode workers."""
    try:
        # List all workers in the marker directory
        print(f"Checking marker directory: {MARKER_DIR}")
        if not os.path.exists(MARKER_DIR):
            print("Marker directory does not exist. No workers found.")
            return

        # Get all worker status
        workers = list_workers()

        if not workers:
            print("No worker marker files found.")
            return

        print(f"Found {len(workers)} worker marker files:")
        for worker in workers:
            # Print key information about each worker
            print(f"Agent ID: {worker['agent_id']}")
            print(f"  PID: {worker['pid']}")
            print(f"  Running: {worker['process_running']}")
            print(f"  Status: {worker['status']}")
            if worker["details"]:
                started_at = worker["details"].get("started_at", "unknown")
                last_check = worker["details"].get("last_check", "unknown")
                print(f"  Started: {started_at}")
                print(f"  Last check: {last_check}")
            print("")

    except Exception as e:
        print(f"Error listing workers: {e}")


def clean_stale_markers() -> None:
    """Clean up stale worker marker files."""
    try:
        # Check if the marker directory exists
        if not os.path.exists(MARKER_DIR):
            print("Marker directory does not exist. Nothing to clean.")
            return

        # Get all worker status
        workers = list_workers()

        if not workers:
            print("No worker marker files found.")
            return

        # Count of cleaned files
        cleaned = 0

        # Check each worker
        for worker in workers:
            agent_id = worker["agent_id"]
            pid = worker["pid"]

            # Check if the process is running
            if not worker["process_running"]:
                # Process is not running, clean up the marker files
                print(f"Cleaning up marker files for agent {agent_id} (pid {pid})")

                # Remove pid file
                pid_file = f"{MARKER_DIR}/agent_{agent_id}.pid"
                if os.path.exists(pid_file):
                    os.remove(pid_file)
                    cleaned += 1
                    print(f"  Removed pid file: {pid_file}")

                # Remove status file
                status_file = f"{MARKER_DIR}/agent_{agent_id}.status"
                if os.path.exists(status_file):
                    os.remove(status_file)
                    cleaned += 1
                    print(f"  Removed status file: {status_file}")

        print(f"Cleaned up {cleaned} stale marker files.")

    except Exception as e:
        print(f"Error cleaning markers: {e}")


def restart_workers() -> None:
    """Restart socket mode workers."""
    try:
        # First, get a database session
        db = next(get_db())

        # Get all agents with socket mode enabled
        agents = (
            db.query(SlackAgentModel).filter(SlackAgentModel.socket_mode_enabled.is_(True)).all()
        )

        if not agents:
            print("No agents with socket_mode_enabled=True found in the database.")
            return

        print(f"Found {len(agents)} agents with socket_mode_enabled=True in the database:")
        for agent in agents:
            agent_id = agent.id
            print(f"Agent ID: {agent_id}, Name: {agent.name}")

            # Check if a worker is already running for this agent
            worker_status = get_worker_status(agent_id)
            if worker_status["process_running"]:
                print(f"  Worker already running for agent {agent_id}, skipping restart")
                continue

            # If nothing is running, call the recover endpoint
            print(f"  Restarting worker for agent {agent_id}...")

            # Import the socket manager
            from pyspur.integrations.slack.socket_manager import SocketManager

            socket_manager = SocketManager()

            # Start the worker
            success = socket_manager.start_worker(agent_id)
            if success:
                print(f"  Successfully started worker for agent {agent_id}")
            else:
                print(f"  Failed to start worker for agent {agent_id}")

    except Exception as e:
        print(f"Error restarting workers: {e}")
    finally:
        db.close()


def fix_database_state() -> None:
    """Fix database state to match reality."""
    try:
        # First, get a database session
        db = next(get_db())

        # Get all agents
        all_agents = db.query(SlackAgentModel).all()
        if not all_agents:
            print("No agents found in the database.")
            return

        # Check each agent's status
        for agent in all_agents:
            agent_id = agent.id

            # Check if there's a worker running for this agent
            is_running, _ = find_running_worker_process(agent_id)
            db_enabled = bool(agent.socket_mode_enabled)

            # If there's a mismatch between the database and reality, fix it
            if is_running and not db_enabled:
                print(
                    f"Agent {agent_id}: Worker is running but socket_mode_enabled is False, fixing..."
                )
                agent.socket_mode_enabled = True
                db.commit()
                db.refresh(agent)
                print(f"  Updated database state for agent {agent_id}")
            elif not is_running and db_enabled:
                print(
                    f"Agent {agent_id}: Worker is not running but socket_mode_enabled is True, fixing..."
                )
                agent.socket_mode_enabled = False
                db.commit()
                db.refresh(agent)
                print(f"  Updated database state for agent {agent_id}")
            else:
                print(
                    f"Agent {agent_id}: Database state matches reality (socket_mode_enabled={db_enabled})"
                )

    except Exception as e:
        print(f"Error fixing database state: {e}")
    finally:
        db.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Repair Socket Mode Workers")
    parser.add_argument("--list", action="store_true", help="List all socket mode workers")
    parser.add_argument("--clean", action="store_true", help="Clean up stale marker files")
    parser.add_argument("--restart", action="store_true", help="Restart workers")
    parser.add_argument("--fix-db", action="store_true", help="Fix database state to match reality")

    args = parser.parse_args()

    # If no arguments provided, show help
    if not (args.list or args.clean or args.restart or args.fix_db):
        parser.print_help()
        return

    # Run the requested actions
    if args.list:
        print("\n=== Listing Socket Mode Workers ===")
        list_all_workers()

    if args.clean:
        print("\n=== Cleaning Stale Marker Files ===")
        clean_stale_markers()

    if args.restart:
        print("\n=== Restarting Socket Mode Workers ===")
        restart_workers()

    if args.fix_db:
        print("\n=== Fixing Database State ===")
        fix_database_state()


if __name__ == "__main__":
    main()
