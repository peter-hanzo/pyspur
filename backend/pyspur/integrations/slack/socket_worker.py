#!/usr/bin/env python
"""Standalone worker for Slack Socket Mode connections.
This allows the socket connections to run in separate processes from the main API.
"""

import asyncio
import logging
import os
import random
import signal
import sys
from typing import Any, Dict, List, Set

from loguru import logger
from sqlalchemy.orm import Session

from ...database import get_db
from ...models.slack_agent_model import SlackAgentModel

# Import related models to ensure SQLAlchemy relationships are properly initialized
from .socket_client import SocketModeClient, get_socket_mode_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger.info("Starting Slack Socket Mode Worker")

# Socket health check interval (in seconds)
HEALTH_CHECK_INTERVAL = 30

# Default monitor refresh interval (in seconds)
DEFAULT_REFRESH_INTERVAL = 60

# Maximum backoff time for reconnection attempts (in seconds)
MAX_BACKOFF = 300

# Track socket connection failures
connection_failures: Dict[int, int] = {}
# Track reconnection attempts to implement backoff
reconnection_attempts: Dict[int, int] = {}
# Track sockets that have been verified as healthy
healthy_sockets: Set[int] = set()


def get_active_agents(db: Session) -> List[SlackAgentModel]:
    """Get all active agents that have socket mode enabled"""
    agents = (
        db.query(SlackAgentModel)
        .filter(
            SlackAgentModel.is_active,  # Boolean columns can be used directly as criteria
            SlackAgentModel.trigger_enabled,
            SlackAgentModel.has_bot_token,
            SlackAgentModel.workflow_id.isnot(None),
        )
        .all()
    )
    return agents


async def check_socket_health(socket_client: SocketModeClient, agent_ids: Set[int]):
    """Periodically check the health of all active socket connections

    Args:
        socket_client: The SocketModeClient instance
        agent_ids: Set of agent IDs that should have active sockets

    """
    while True:
        try:
            for agent_id in agent_ids:
                # Skip if the connection is already known to be unhealthy
                if agent_id not in healthy_sockets:
                    continue

                # Check if the socket connection is still active
                if not socket_client.is_running(agent_id):
                    logger.warning(f"Socket for agent {agent_id} is no longer running")
                    healthy_sockets.discard(agent_id)
                    # Mark for reconnection in the next monitor cycle
                    connection_failures[agent_id] = connection_failures.get(agent_id, 0) + 1
        except Exception as e:
            logger.error(f"Error in socket health check: {e}")

        await asyncio.sleep(HEALTH_CHECK_INTERVAL)


def calculate_backoff(agent_id: int) -> float:
    """Calculate reconnection backoff time using exponential backoff with jitter

    Args:
        agent_id: The agent ID to calculate backoff for

    Returns:
        Backoff time in seconds

    """
    attempt = reconnection_attempts.get(agent_id, 0)
    if attempt == 0:
        return 0

    # Exponential backoff with cap
    base_delay = min(MAX_BACKOFF, 2 ** min(attempt, 8))
    # Add jitter (random value between 0 and 1)
    jitter = random.random()
    return base_delay + jitter


async def monitor_and_restart_sockets(
    socket_client: SocketModeClient, refresh_interval: int = DEFAULT_REFRESH_INTERVAL
):
    """Monitor active agents and start/restart socket connections as needed

    Args:
        socket_client: The SocketModeClient instance
        refresh_interval: How often to check for new agents (in seconds)

    """
    active_agent_ids: Dict[int, bool] = {}  # Maps agent_id to active status

    while True:
        try:
            db = next(get_db())
            try:
                # Get all agents that should have active socket connections
                agents = get_active_agents(db)
                # Extract the integer IDs from SQLAlchemy objects
                current_agent_ids = {int(agent.id): True for agent in agents}

                # Find agents that need to be started/restarted
                for agent_id in current_agent_ids:
                    # Calculate backoff for this agent
                    backoff_time = calculate_backoff(agent_id)

                    # Skip this agent if we're in a backoff period
                    if backoff_time > 0:
                        logger.info(
                            f"In backoff period for agent {agent_id}, waiting {backoff_time:.1f}s before retry"
                        )
                        # Reduce the backoff counter for next time
                        reconnection_attempts[agent_id] = max(
                            0, reconnection_attempts.get(agent_id, 0) - 1
                        )
                        continue

                    # Check if we need to start or restart this socket
                    if agent_id not in active_agent_ids or not socket_client.is_running(agent_id):
                        logger.info(f"Starting socket for agent {agent_id}")
                        success = socket_client.start_socket_mode(agent_id)

                        if success:
                            logger.info(f"Successfully started socket for agent {agent_id}")
                            healthy_sockets.add(agent_id)
                            # Reset failure counter
                            connection_failures[agent_id] = 0
                            reconnection_attempts[agent_id] = 0
                        else:
                            logger.error(f"Failed to start socket for agent {agent_id}")
                            if agent_id in healthy_sockets:
                                healthy_sockets.remove(agent_id)
                            # Increment failure counter
                            connection_failures[agent_id] = connection_failures.get(agent_id, 0) + 1
                            reconnection_attempts[agent_id] = (
                                reconnection_attempts.get(agent_id, 0) + 1
                            )

                # Stop sockets for agents that are no longer active
                for agent_id in list(active_agent_ids.keys()):
                    if agent_id not in current_agent_ids:
                        logger.info(
                            f"Stopping socket for agent {agent_id} - agent no longer active"
                        )
                        socket_client.stop_socket_mode(agent_id)
                        if agent_id in healthy_sockets:
                            healthy_sockets.remove(agent_id)
                        # Clear any failure tracking
                        if agent_id in connection_failures:
                            del connection_failures[agent_id]
                        if agent_id in reconnection_attempts:
                            del reconnection_attempts[agent_id]

                # Update our tracking of active agents
                active_agent_ids = current_agent_ids

                # Log status summary
                if active_agent_ids:
                    logger.info(
                        f"Socket status: {len(healthy_sockets)}/{len(active_agent_ids)} connections healthy"
                    )

            except Exception as e:
                logger.error(f"Error in socket monitor: {e}")
                import traceback

                logger.error(f"Traceback: {traceback.format_exc()}")
            finally:
                db.close()

            # Sleep before checking again
            await asyncio.sleep(refresh_interval)

        except Exception as e:
            logger.error(f"Critical error in monitor_and_restart_sockets: {e}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            await asyncio.sleep(refresh_interval)


def setup_shutdown_handler(socket_client: SocketModeClient):
    """Set up signal handlers for graceful shutdown"""

    def handle_shutdown(signum: int, frame: Any) -> None:
        logger.info(f"Received signal {signum}, shutting down")
        socket_client.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)


async def main():
    """Main entry point for the worker"""
    # Initialize the socket client
    socket_client = get_socket_mode_client()

    # Set up shutdown handlers
    setup_shutdown_handler(socket_client)

    # Print worker info
    worker_id = os.environ.get("HOSTNAME", "unknown")
    logger.info(f"Socket worker {worker_id} started")

    # Add a brief delay to ensure database is ready
    await asyncio.sleep(5)

    # Start the monitor task
    monitor_task = asyncio.create_task(monitor_and_restart_sockets(socket_client))

    # Start the health check task
    health_check_task = asyncio.create_task(check_socket_health(socket_client, healthy_sockets))

    try:
        # Keep the worker running
        while True:
            await asyncio.sleep(3600)  # Sleep for an hour
    except asyncio.CancelledError:
        # Cancel the tasks
        monitor_task.cancel()
        health_check_task.cancel()
        try:
            await asyncio.gather(monitor_task, health_check_task, return_exceptions=True)
        except asyncio.CancelledError:
            pass
    finally:
        # Ensure all sockets are stopped
        socket_client.stop_all()


if __name__ == "__main__":
    # Run the main function
    asyncio.run(main())
