import uuid

import boto3
from botocore.client import BaseClient
from fastapi import HTTPException, status

from app.core.config import get_settings

settings = get_settings()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _build_r2_client() -> BaseClient:
    if not (
        settings.r2_account_id
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
        and settings.r2_bucket
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Photo storage is not configured",
        )
    endpoint = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def upload_session_photo(data: bytes, content_type: str, session_id: int, uploader_id: int) -> tuple[str, str]:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    max_bytes = settings.max_photo_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image is too large (max {settings.max_photo_upload_mb} MB)",
        )

    extension = ".jpg"
    if content_type == "image/png":
        extension = ".png"
    elif content_type == "image/webp":
        extension = ".webp"
    elif content_type in {"image/heic", "image/heif"}:
        extension = ".heic"

    key = f"sessions/{session_id}/{uploader_id}/{uuid.uuid4().hex}{extension}"
    client = _build_r2_client()
    client.put_object(
        Bucket=settings.r2_bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )

    if settings.r2_public_base_url:
        public_url = f"{settings.r2_public_base_url.rstrip('/')}/{key}"
    else:
        public_url = f"https://{settings.r2_bucket}.{settings.r2_account_id}.r2.cloudflarestorage.com/{key}"
    return key, public_url
