#!/usr/bin/env python
"""Worker process for handling a single Slack Socket Mode connection.

This runs in a separate process managed by the SocketManager.
"""

import asyncio
import logging
import os
import signal
import sys
import types
from datetime import datetime
from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from ...api.slack_management import handle_socket_mode_event_sync
from ...database import get_db
from ...models.slack_agent_model import SlackAgentModel
from .socket_client import SocketModeClient, get_socket_mode_client

# Configure logging
logging.basicConfig(level=logging.INFO)


def get_active_agents(db: Session) -> list[SlackAgentModel]:
    """Get all active agents that have socket mode enabled."""
    agents = (
        db.query(SlackAgentModel)
        .filter_by(
            is_active=True, trigger_enabled=True, has_bot_token=True, socket_mode_enabled=True
        )
        .filter(SlackAgentModel.workflow_id.isnot(None))
        .all()
    )
    return agents


def setup_shutdown_handler(socket_client: SocketModeClient, agent_id: int):
    """Set up signal handlers for graceful shutdown."""

    def handle_shutdown(signum: int, frame: Optional[types.FrameType]) -> None:
        logger.info(f"Worker {agent_id} received signal {signum}, shutting down")
        socket_client.stop_socket_mode(agent_id)
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)


async def check_agent_status(db: Session, agent_id: int) -> bool:
    """Check if the agent is still active and should be running.

    Args:
        db: Database session
        agent_id: The agent ID to check

    Returns:
        bool: True if the agent should be running, False otherwise

    """
    try:
        agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
        if not agent:
            logger.warning(f"Agent {agent_id} no longer exists")
            return False

        return (
            bool(agent.is_active)
            and bool(agent.trigger_enabled)
            and bool(agent.has_bot_token)
            and bool(agent.workflow_id)
            and bool(agent.socket_mode_enabled)
        )
    except Exception as e:
        logger.error(f"Error checking agent {agent_id} status: {e}")
        return False


async def run_worker(agent_id: int):
    """Run the worker process for a specific agent

    Args:
        agent_id: The ID of the Slack agent to handle

    """
    # Initialize the socket client
    socket_client = get_socket_mode_client()
    socket_client.set_workflow_trigger_callback(handle_socket_mode_event_sync)

    # Set up shutdown handlers
    setup_shutdown_handler(socket_client, agent_id)

    # Print worker info
    worker_id = os.environ.get("HOSTNAME", "unknown")
    logger.info(f"Socket worker {worker_id} started for agent {agent_id}")

    # Create a marker file to indicate this worker is running
    # This helps with tracking workers even if the API restarts
    marker_dir = "/tmp/pyspur_socket_workers"
    os.makedirs(marker_dir, exist_ok=True)
    marker_file = f"{marker_dir}/agent_{agent_id}.pid"
    with open(marker_file, "w") as f:
        f.write(str(os.getpid()))

    status_file = f"{marker_dir}/agent_{agent_id}.status"

    # Register a cleanup function to remove the marker file when the process exits
    import atexit

    def cleanup_marker():
        try:
            if os.path.exists(marker_file):
                os.remove(marker_file)
                logger.info(f"Removed marker file {marker_file}")
        except Exception as e:
            logger.error(f"Error removing marker file: {e}")

    atexit.register(cleanup_marker)

    # Add a brief delay to ensure database is ready
    await asyncio.sleep(5)

    try:
        # Start socket mode for this agent
        success = socket_client.start_socket_mode(agent_id)
        if not success:
            logger.error(f"Failed to start socket mode for agent {agent_id}")
            return

        logger.info(f"Socket mode started for agent {agent_id}")

        # Write status information to a status file
        try:
            with open(status_file, "w") as f:
                import json

                status_info = {
                    "agent_id": agent_id,
                    "started_at": datetime.now().isoformat(),
                    "pid": os.getpid(),
                    "hostname": worker_id,
                    "status": "running",
                }
                f.write(json.dumps(status_info))
        except Exception as status_err:
            logger.error(f"Error writing status file: {status_err}")

        # Keep checking the agent's status and be resilient to database connection issues
        max_retries = 3
        retry_count = 0
        while True:
            try:
                db = next(get_db())
                try:
                    # Check if we should still be running
                    should_run = await check_agent_status(db, agent_id)
                    # Reset retry counter on successful check
                    retry_count = 0

                    if not should_run:
                        logger.info(f"Agent {agent_id} is no longer active, shutting down")
                        break

                    # Check if socket is still running
                    if not socket_client.is_running(agent_id):
                        logger.warning(
                            f"Socket for agent {agent_id} is not running, attempting restart"
                        )
                        success = socket_client.start_socket_mode(agent_id)
                        if not success:
                            logger.error(f"Failed to restart socket for agent {agent_id}")
                            retry_count += 1
                            if retry_count >= max_retries:
                                logger.error(
                                    f"Reached max retries ({max_retries}) for agent {agent_id}, shutting down"
                                )
                                break
                finally:
                    db.close()
            except asyncio.CancelledError:
                logger.info(f"Worker {agent_id} received cancellation, shutting down gracefully")
                break
            except Exception as e:
                logger.error(f"Error in worker loop for agent {agent_id}: {e}")
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(
                        f"Reached max retries ({max_retries}) for agent {agent_id}, shutting down"
                    )
                    break
                await asyncio.sleep(5)

    except Exception as e:
        logger.error(f"Critical error in worker for agent {agent_id}: {e}")
    finally:
        # Ensure socket is stopped and cleanup is performed
        try:
            socket_client.stop_socket_mode(agent_id)
        except Exception as stop_err:
            logger.error(f"Error stopping socket mode: {stop_err}")

        # Update status file to indicate shutdown
        try:
            with open(status_file, "w") as f:
                import json

                status_info = {
                    "agent_id": agent_id,
                    "shutdown_at": datetime.now().isoformat(),
                    "pid": os.getpid(),
                    "hostname": worker_id,
                    "status": "stopped",
                }
                f.write(json.dumps(status_info))
        except Exception as status_err:
            logger.error(f"Error updating status file on shutdown: {status_err}")

        # Try to clean up marker files
        cleanup_marker()


def main(agent_id: Optional[int] = None):
    """Main entry point for the worker

    Args:
        agent_id: Optional agent ID to handle. If not provided, will handle all active agents.

    """
    if agent_id is None:
        logger.error("No agent ID provided")
        sys.exit(1)

    try:
        asyncio.run(run_worker(agent_id))
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down")
    except Exception as e:
        logger.error(f"Error in worker main: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # If running directly, get agent ID from environment
    agent_id_str = os.environ.get("SLACK_AGENT_ID")
    if not agent_id_str:
        logger.error("No agent ID provided")
        sys.exit(1)
    try:
        agent_id = int(agent_id_str)
    except ValueError:
        logger.error(f"Invalid agent ID: {agent_id_str}")
        sys.exit(1)
    main(agent_id)
