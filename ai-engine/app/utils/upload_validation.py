from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_UPLOAD_FILES = 10

ALLOWED_UPLOAD_TYPES: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".doc": {"application/msword"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".ppt": {"application/vnd.ms-powerpoint"},
    ".pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    ".txt": {"text/plain"},
    ".md": {"text/markdown", "text/plain"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
}


async def validate_uploads(files: list[UploadFile]) -> None:
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A maximum of {MAX_UPLOAD_FILES} files may be uploaded at once.",
        )

    for file in files:
        extension = Path(file.filename or "").suffix.lower()
        allowed_types = ALLOWED_UPLOAD_TYPES.get(extension)
        if not allowed_types or (file.content_type or "") not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type for '{file.filename or 'unnamed file'}'.",
            )

        total_bytes = 0
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{file.filename or 'unnamed file'}' exceeds the 25MB limit.",
                )

        if total_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename or 'unnamed file'}' is empty.",
            )
        await file.seek(0)