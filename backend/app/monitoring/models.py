# monitoring/models.py
from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class Event:
    timestamp: float
    message: str
    metadata: Dict[str, Any]
    user_id: str


@dataclass
class Error:
    timestamp: float
    message: str
    exception: Exception
    metadata: Dict[str, Any]
    user_id: str
