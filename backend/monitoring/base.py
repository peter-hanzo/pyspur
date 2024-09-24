# monitoring/base.py
from abc import ABC, abstractmethod
from typing import Any


class MonitoringProvider(ABC):
    @abstractmethod
    def log_event(self, event: Any) -> None:
        """Logs an event."""
        pass

    @abstractmethod
    def log_error(self, error: Any) -> None:
        """Logs an error."""
        pass

    @abstractmethod
    def flush(self) -> None:
        """Flushes any buffered data."""
        pass
