from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import time


class BaseAgent(ABC):
    """Abstract AI Agent interface for Vision2Real startup validation team."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.status = "waiting"  # "waiting", "running", "completed", "failed"
        self.progress = 0.0
        self.error_message: Optional[str] = None

    @abstractmethod
    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Executes agent-specific validation work using input context dictionary.

        Returns a dictionary containing the agent's structured outputs.
        """
        pass

    def mark_running(self):
        self.status = "running"
        self.progress = 10.0
        self.error_message = None

    def mark_completed(self, progress: float = 100.0):
        self.status = "completed"
        self.progress = progress

    def mark_failed(self, error: str):
        self.status = "failed"
        self.error_message = error
