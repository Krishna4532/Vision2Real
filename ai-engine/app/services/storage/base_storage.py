from abc import ABC, abstractmethod
from typing import Optional


class StorageProvider(ABC):
    """Abstract interface for file storage.

    Future implementations (S3, Azure Blob, Cloudflare R2) must implement
    this interface. ValidationService depends only on StorageProvider.
    """

    @abstractmethod
    async def store(self, content: bytes, filename: str, mime_type: str) -> str:
        """Persist *content* and return a stable storage path / key."""

    @abstractmethod
    async def delete(self, storage_path: str) -> None:
        """Remove a previously stored object."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the storage backend is reachable."""
