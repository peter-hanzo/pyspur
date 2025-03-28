import logging
import multiprocessing
import os
import signal
import time
from types import FrameType
from typing import Any, Dict, Optional, cast

import psutil
from loguru import logger
from sqlalchemy.orm import Session

from ...database import get_db
from ...models.slack_agent_model import SlackAgentModel
from .socket_worker import get_active_agents
from .socket_worker import main as worker_main
from .worker_status import MARKER_DIR, find_running_worker_process

# Configure logging
logging.basicConfig(level=logging.INFO)
logger.info("Starting Slack Socket Manager")


class SocketManager:
    """Manager for Slack Socket Mode workers using multiprocessing.

    This manages multiple worker processes, each handling a specific Slack agent.
    """

    _instance: Optional["SocketManager"] = None

    def __new__(cls, *args: Any, **kwargs: Any) -> "SocketManager":
        if cls._instance is None:
            cls._instance = super(SocketManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Prevent reinitializing on subsequent instantiations
        if hasattr(self, "_initialized") and self._initialized:
            return
        # ProcessLike is anything with pid and is_alive() attributes
        self.workers: Dict[int, Any] = {}
        self.stopping = False
        self.setup_signal_handlers()
        self._initialized = True

    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        signal.signal(signal.SIGTERM, lambda signum, frame: self.handle_shutdown(signum, frame))
        signal.signal(signal.SIGINT, lambda signum, frame: self.handle_shutdown(signum, frame))

    def handle_shutdown(self, signum: int, frame: Optional[FrameType] = None) -> None:
        """Handle shutdown signals by stopping all workers gracefully."""
        logger.info(f"Received signal {signum}, shutting down all workers...")
        self.stopping = True
        self.stop_all_workers()

    def start_worker(self, agent_id: int) -> bool:
        """Start a new worker process for a specific agent.

        Args:
            agent_id: The ID of the Slack agent to handle

        Returns:
            bool: True if worker started successfully, False otherwise

        """
        agent_id = int(agent_id)
        # First check if there's an existing worker that's actually running
        if agent_id in self.workers:
            existing_worker = self.workers[agent_id]
            if existing_worker.is_alive():
                logger.info(
                    f"Worker for agent {agent_id} is already running (PID: {existing_worker.pid if hasattr(existing_worker, 'pid') else 'unknown'})"
                )
                return True
            else:
                # Worker exists but isn't running - clean it up
                logger.warning(f"Found non-running worker for agent {agent_id} - cleaning up")
                try:
                    if hasattr(existing_worker, "terminate"):
                        existing_worker.terminate()
                    del self.workers[agent_id]
                except Exception as e:
                    logger.error(f"Error cleaning up dead worker for agent {agent_id}: {e}")

        # Check for existing marker files and running processes even if not tracked in our workers dictionary
        marker_file = f"{MARKER_DIR}/agent_{agent_id}.pid"
        pid = None
        is_running = False

        # First check if a marker file exists and get the PID from it
        if os.path.exists(marker_file):
            try:
                with open(marker_file, "r") as f:
                    pid_str = f.read().strip()
                    if pid_str:
                        pid = int(pid_str)
                        logger.info(
                            f"Found existing marker file for agent {agent_id} with PID {pid}"
                        )
            except Exception as e:
                logger.error(f"Error reading PID from marker file for agent {agent_id}: {e}")

        # Check if the process is running
        if pid is not None:
            try:
                if psutil.pid_exists(pid):
                    # Verify this is actually a socket worker for this agent
                    proc = psutil.Process(pid)
                    cmdline = " ".join(proc.cmdline())
                    if "socket_worker.py" in cmdline and f"SLACK_AGENT_ID={agent_id}" in cmdline:
                        is_running = True
                        logger.info(
                            f"Found running socket worker for agent {agent_id} with PID {pid}"
                        )

                        # Create a tracking object for this process
                        from types import SimpleNamespace

                        dummy_process = SimpleNamespace()
                        dummy_process.pid = pid

                        # Add method to check if process is still alive
                        def is_alive_check():
                            if pid is None:
                                return False
                            try:
                                return psutil.pid_exists(pid) and "socket_worker.py" in " ".join(
                                    psutil.Process(pid).cmdline()
                                )
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                return False

                        dummy_process.is_alive = is_alive_check
                        self.workers[agent_id] = dummy_process
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
                logger.warning(f"Error checking process {pid} for agent {agent_id}: {e}")
                pass

        # If no existing process was found using marker files, do a more thorough search
        if not is_running:
            is_running, pid = find_running_worker_process(agent_id)
            if is_running and pid:
                logger.info(
                    f"Found running worker for agent {agent_id} using process search: PID {pid}"
                )
                # Create a tracking object for this process
                try:
                    from types import SimpleNamespace

                    dummy_process = SimpleNamespace()
                    dummy_process.pid = pid

                    # Add method to check if process is still alive
                    def is_alive_check():
                        try:
                            return psutil.pid_exists(pid) and "socket_worker.py" in " ".join(
                                psutil.Process(pid).cmdline()
                            )
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            return False

                    dummy_process.is_alive = is_alive_check
                    self.workers[agent_id] = dummy_process
                    return True
                except ImportError:
                    # If psutil is not available, we can't track the process
                    pass

        # If we get here, no valid worker is running, so start a new one
        try:
            # Create and start a new process for this agent
            logger.info(f"Starting new worker process for agent {agent_id}")

            # Set environment variable to pass the agent ID
            env = os.environ.copy()
            env["SLACK_AGENT_ID"] = str(agent_id)

            # Create the process
            process = multiprocessing.Process(
                target=worker_main, args=(agent_id,), name=f"socket_worker_{agent_id}"
            )
            process.daemon = True  # Make sure process is daemonized
            process.start()
            self.workers[agent_id] = process
            logger.info(f"Started worker process for agent {agent_id} (PID: {process.pid})")

            # Wait a short moment to ensure process started correctly
            time.sleep(0.5)
            if not process.is_alive():
                logger.error(f"Worker process for agent {agent_id} failed to start")
                return False

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
        agent_id = int(agent_id)
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
            active_agent_ids = {int(cast(int, agent.id)) for agent in active_agents}

            # First, check existing workers and update their status in the database
            for agent_id in list(self.workers.keys()):
                agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
                if agent:
                    # Check if the worker is actually running
                    is_alive = self.workers[agent_id].is_alive()

                    # Update the database to match reality if there's a mismatch
                    if bool(getattr(agent, "socket_mode_enabled", False)) != is_alive:
                        logger.info(
                            f"Updating agent {agent_id} socket_mode_enabled to {is_alive} to match actual state"
                        )
                        agent.socket_mode_enabled = is_alive
                        db.commit()
                        db.refresh(agent)

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
