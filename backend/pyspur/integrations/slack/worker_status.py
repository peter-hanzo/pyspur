"""Module for checking the status of Slack socket mode workers.

This provides utilities for identifying running workers from marker files
and status files, which helps maintain state between API restarts.
"""

import json
import os
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import psutil
from loguru import logger

# Base directory for worker marker files
MARKER_DIR = "/tmp/pyspur_socket_workers"


class WorkerStatus(TypedDict):
    agent_id: int
    marker_exists: bool
    process_running: bool
    pid: Optional[int]
    status_file_exists: bool
    status: str
    details: Dict[str, Any]


def get_worker_status(agent_id: int) -> WorkerStatus:
    """Get the status of a worker for a specific agent.

    Args:
        agent_id: The ID of the agent to check

    Returns:
        Dict: A dictionary with status information

    """
    result = WorkerStatus(
        agent_id=agent_id,
        marker_exists=False,
        process_running=False,
        pid=None,
        status_file_exists=False,
        status="unknown",
        details={},
    )

    # Ensure the marker directory exists
    if not os.path.exists(MARKER_DIR):
        return result

    # Check for marker file
    marker_file = f"{MARKER_DIR}/agent_{agent_id}.pid"
    if os.path.exists(marker_file):
        result["marker_exists"] = True

        # Read the PID
        try:
            with open(marker_file, "r") as f:
                pid = int(f.read().strip())
                result["pid"] = pid

            # Check if process is running
            try:
                process = psutil.Process(pid)
                cmdline = process.cmdline()
                cmdline_str = " ".join(cmdline)
                if (
                    "socket_worker.py" in cmdline_str
                    and f"SLACK_AGENT_ID={agent_id}" in cmdline_str
                ):
                    result["process_running"] = True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        except Exception as e:
            logger.error(f"Error reading PID from marker file for agent {agent_id}: {e}")

    # Check for status file
    status_file = f"{MARKER_DIR}/agent_{agent_id}.status"
    if os.path.exists(status_file):
        result["status_file_exists"] = True

        # Read the status
        try:
            with open(status_file, "r") as f:
                status_data = json.load(f)
                result["status"] = status_data.get("status", "unknown")
                result["details"] = status_data
        except Exception as e:
            logger.error(f"Error reading status file for agent {agent_id}: {e}")

    return result


def list_workers() -> List[Dict[str, Any]]:
    """List all workers based on marker files.

    Returns:
        List[Dict[str, Any]]: A list of worker status dictionaries

    """
    results: List[Dict[str, Any]] = []

    # Ensure the marker directory exists
    if not os.path.exists(MARKER_DIR):
        return results

    # Find all marker files
    for filename in os.listdir(MARKER_DIR):
        if filename.startswith("agent_") and filename.endswith(".pid"):
            try:
                # Extract agent ID
                agent_id_str = filename[6:-4]  # Remove "agent_" prefix and ".pid" suffix
                agent_id = int(agent_id_str)

                # Get status for this agent
                status = get_worker_status(agent_id)
                results.append(dict(status))
            except Exception as e:
                logger.error(f"Error processing marker file {filename}: {e}")

    return results


def find_running_worker_process(agent_id: int) -> Tuple[bool, Optional[int]]:
    """Find a running worker process for the given agent ID.

    Args:
        agent_id: The agent ID to look for

    Returns:
        Tuple[bool, Optional[int]]: A tuple of (is_running, pid)

    """
    for proc in psutil.process_iter(["pid", "cmdline"]):
        try:
            cmdline = proc.info["cmdline"]
            if cmdline:
                cmdline_str = " ".join(cmdline)
                if "socket_worker.py" in cmdline_str and (
                    f"SLACK_AGENT_ID={agent_id}" in cmdline_str
                    or f"--agent-id={agent_id}" in cmdline_str
                ):
                    return True, proc.info["pid"]
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return False, None
