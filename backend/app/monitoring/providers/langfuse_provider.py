# monitoring/providers/langfuse_provider.py
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

from langfuse import Langfuse

from ..base import MonitoringProvider
from ..models import Error, Event


class LangfuseProvider(MonitoringProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        public_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("LANGFUSE_API_KEY")
        self.langfuse = Langfuse(
            public_key=public_key
            or os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-1234567890"),
            secret_key=secret_key
            or os.getenv("LANGFUSE_SECRET_KEY", "sk-lf-1234567890"),
        )
        # Initialize any other Langfuse configurations here

    def log_event(self, event: Event) -> None:
        try:
            trace = self.langfuse.trace(
                name=event.message,
                user_id=event.user_id,
                metadata=event.metadata,
            )
        except Exception as e:
            print(f"Error logging event to Langfuse: {e}")

    def log_error(self, error: Error) -> None:
        try:
            trace = self.langfuse.trace(
                name=error.message,
                user_id=error.user_id,
                metadata=error.metadata,
            )
            trace = trace.span(
                name="error-span",
                metadata={"exception": str(error.exception)},
            )
        except Exception as e:
            print(f"Error logging error to Langfuse: {e}")

    def flush(self) -> None:
        try:
            self.langfuse.flush()
        except Exception as e:
            print(f"Error flushing Langfuse data: {e}")
