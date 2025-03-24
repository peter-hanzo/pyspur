import logging
import multiprocessing
import signal
import sys
import time
from typing import Dict

from loguru import logger
from sqlalchemy.orm import Session

from ...database import get_db
from .socket_worker import get_active_agents
from .socket_worker import main as worker_main

# Configure logging
logging.basicConfig(level=logging.INFO)
logger.info("Starting Slack Socket Manager")


class SocketManager:
    """Manager for Slack Socket Mode workers using multiprocessing.
    This manages multiple worker processes, each handling a specific Slack agent.
    """

    def __init__(self):
        """Initialize the socket manager."""
        self.workers: Dict[int, multiprocessing.Process] = {}
        self.stopping = False
        self.setup_signal_handlers()

    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)

    def handle_shutdown(self, signum: int, frame) -> None:
        """Handle shutdown signals by stopping all workers gracefully."""
        logger.info(f"Received signal {signum}, shutting down all workers...")
        self.stopping = True
        self.stop_all_workers()
        sys.exit(0)

    def start_worker(self, agent_id: int) -> bool:
        """Start a new worker process for a specific agent.

        Args:
            agent_id: The ID of the Slack agent to handle

        Returns:
            bool: True if worker started successfully, False otherwise

        """
        if agent_id in self.workers and self.workers[agent_id].is_alive():
            logger.warning(f"Worker for agent {agent_id} is already running")
            return False

        try:
            # Create and start a new process for this agent
            process = multiprocessing.Process(
                target=worker_main, args=(agent_id,), name=f"socket_worker_{agent_id}"
            )
            process.daemon = True  # Make sure process is daemonized
            process.start()
            self.workers[agent_id] = process
            logger.info(f"Started worker process for agent {agent_id} (PID: {process.pid})")
            return True
        except Exception as e:
            logger.error(f"Failed to start worker for agent {agent_id}: {e}")
            return False

    def stop_worker(self, agent_id: int) -> bool:
        """Stop a specific worker process.

        Args:
            agent_id: The ID of the Slack agent whose worker should be stopped

        Returns:
            bool: True if worker was stopped successfully, False otherwise

        """
        if agent_id not in self.workers:
            return True

        process = self.workers[agent_id]
        try:
            if process.is_alive():
                # Send SIGTERM to allow graceful shutdown
                process.terminate()
                # Wait for a short time for graceful shutdown
                process.join(timeout=5)

                # If process is still alive, force kill it
                if process.is_alive():
                    logger.warning(f"Worker {agent_id} did not stop gracefully, force killing...")
                    process.kill()
                    process.join(timeout=1)

            del self.workers[agent_id]
            logger.info(f"Stopped worker for agent {agent_id}")
            return True
        except Exception as e:
            logger.error(f"Error stopping worker for agent {agent_id}: {e}")
            return False

    def stop_all_workers(self):
        """Stop all running worker processes."""
        for agent_id in list(self.workers.keys()):
            self.stop_worker(agent_id)

    def check_and_restart_workers(self, db: Session) -> None:
        """Check for any workers that need to be started or stopped.

        Args:
            db: Database session to use for queries

        """
        try:
            # Get all agents that should have active workers
            active_agents = get_active_agents(db)
            active_agent_ids = {agent.id for agent in active_agents}

            # Stop workers for agents that should no longer be running
            for agent_id in list(self.workers.keys()):
                if agent_id not in active_agent_ids:
                    logger.info(f"Stopping worker for inactive agent {agent_id}")
                    self.stop_worker(agent_id)

            # Start workers for agents that need them
            for agent_id in active_agent_ids:
                if agent_id not in self.workers or not self.workers[agent_id].is_alive():
                    logger.info(f"Starting worker for agent {agent_id}")
                    self.start_worker(agent_id)

            # Log status
            running_workers = sum(1 for p in self.workers.values() if p.is_alive())
            logger.info(f"Worker status: {running_workers}/{len(active_agent_ids)} workers running")

        except Exception as e:
            logger.error(f"Error in worker management: {e}")


def run_socket_manager():
    """Main entry point for the socket manager."""
    manager = SocketManager()
    logger.info("Socket manager started")

    check_interval = 15  # Check every 15 seconds
    while not manager.stopping:
        try:
            # Get a database session
            db = next(get_db())
            try:
                # Check and update workers
                manager.check_and_restart_workers(db)
            finally:
                db.close()

            # Sleep before next check, but be responsive to shutdown
            for _ in range(check_interval):
                if manager.stopping:
                    break
                time.sleep(1)

        except Exception as e:
            logger.error(f"Error in socket manager main loop: {e}")
            # Brief sleep before retry
            time.sleep(5)

    logger.info("Socket manager shutting down")


if __name__ == "__main__":
    run_socket_manager()
