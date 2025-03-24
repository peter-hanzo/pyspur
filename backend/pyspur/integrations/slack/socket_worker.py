#!/usr/bin/env python
"""Worker process for handling a single Slack Socket Mode connection.
This runs in a separate process managed by the SocketManager.
"""

import asyncio
import logging
import os
import signal
import sys
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
    """Get all active agents that have socket mode enabled"""
    agents = (
        db.query(SlackAgentModel)
        .filter(
            SlackAgentModel.is_active,
            SlackAgentModel.trigger_enabled,
            SlackAgentModel.has_bot_token,
            SlackAgentModel.workflow_id.isnot(None),
            SlackAgentModel.socket_mode_enabled.is_(True),
        )
        .all()
    )
    return agents


def setup_shutdown_handler(socket_client: SocketModeClient, agent_id: int):
    """Set up signal handlers for graceful shutdown"""

    def handle_shutdown(signum: int, frame) -> None:
        logger.info(f"Worker {agent_id} received signal {signum}, shutting down")
        socket_client.stop_socket_mode(agent_id)
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)


async def check_agent_status(db: Session, agent_id: int) -> bool:
    """Check if the agent is still active and should be running

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

        return bool(
            agent.is_active
            and agent.trigger_enabled
            and agent.has_bot_token
            and agent.workflow_id is not None
            and agent.socket_mode_enabled
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

    # Add a brief delay to ensure database is ready
    await asyncio.sleep(5)

    try:
        # Start socket mode for this agent
        success = socket_client.start_socket_mode(agent_id)
        if not success:
            logger.error(f"Failed to start socket mode for agent {agent_id}")
            return

        logger.info(f"Socket mode started for agent {agent_id}")

        # Keep checking the agent's status
        while True:
            try:
                db = next(get_db())
                try:
                    # Check if we should still be running
                    should_run = await check_agent_status(db, agent_id)
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
                            break
                finally:
                    db.close()

                # Sleep before next check
                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                logger.error(f"Error in worker loop for agent {agent_id}: {e}")
                await asyncio.sleep(5)  # Brief sleep before retry

    except Exception as e:
        logger.error(f"Critical error in worker for agent {agent_id}: {e}")
    finally:
        # Ensure socket is stopped
        socket_client.stop_socket_mode(agent_id)


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
    agent_id = os.environ.get("SLACK_AGENT_ID")
    if agent_id:
        try:
            agent_id = int(agent_id)
        except ValueError:
            logger.error(f"Invalid agent ID: {agent_id}")
            sys.exit(1)
    main(agent_id)
