# monitoring/manager.py
from typing import List, Any
from .base import MonitoringProvider


class MonitoringManager:
    def __init__(self):
        self.providers: List[MonitoringProvider] = []

    def add_provider(self, provider: MonitoringProvider) -> None:
        self.providers.append(provider)

    def log_event(self, event: Any) -> None:
        for provider in self.providers:
            provider.log_event(event)

    def log_error(self, error: Any) -> None:
        for provider in self.providers:
            provider.log_error(error)

    def flush(self) -> None:
        for provider in self.providers:
            provider.flush()
