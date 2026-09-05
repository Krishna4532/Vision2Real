import os
from pathlib import Path
from app.services.storage.base_storage import StorageProvider

_UPLOAD_DIR = "./uploads/validations"


class LocalStorageProvider(StorageProvider):
    """Stores files on the local filesystem under *root_dir*."""

    def __init__(self, root_dir: str = _UPLOAD_DIR):
        self.root_dir = root_dir
        os.makedirs(self.root_dir, exist_ok=True)

    async def store(self, content: bytes, filename: str, mime_type: str) -> str:
        safe_filename = Path(filename).name
        storage_path = os.path.join(self.root_dir, safe_filename)
        with open(storage_path, "wb") as fh:
            fh.write(content)
        return storage_path

    async def delete(self, storage_path: str) -> None:
        if os.path.exists(storage_path):
            os.remove(storage_path)

    async def health_check(self) -> bool:
        return os.path.isdir(self.root_dir) and os.access(self.root_dir, os.W_OK)
