import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from uuid import uuid4

from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
)
from dotenv import load_dotenv
from fastapi import UploadFile


load_dotenv()

STORAGE_CONNECTION = os.getenv("STORAGE_CONNECTION")
STORAGE_CONTAINER = os.getenv("STORAGE_CONTAINER", "pet-images")


class BlobStorageService:
    def __init__(self) -> None:
        if not STORAGE_CONNECTION:
            raise RuntimeError(
                "STORAGE_CONNECTION was not found in the environment."
            )

        self.blob_service_client = (
            BlobServiceClient.from_connection_string(
                STORAGE_CONNECTION
            )
        )

        self.container_client = (
            self.blob_service_client.get_container_client(
                STORAGE_CONTAINER
            )
        )

    async def upload_pet_photo(
        self,
        device_id: int,
        image: UploadFile,
    ) -> str:
        if not image.content_type:
            raise ValueError(
                "The uploaded file has no content type."
            )

        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        extension = allowed_types.get(image.content_type)

        if extension is None:
            raise ValueError(
                "Only JPG, PNG, and WEBP images are supported."
            )

        unique_suffix = uuid4().hex

        blob_name = (
            f"devices/{device_id}/"
            f"profile-{unique_suffix}{extension}"
        )

        blob_client = self.container_client.get_blob_client(
            blob_name
        )

        await image.seek(0)

        blob_client.upload_blob(
            image.file,
            overwrite=False,
            content_settings=ContentSettings(
                content_type=image.content_type
            ),
        )

        return blob_client.url

    def delete_blob_from_url(
        self,
        blob_url: str,
    ) -> None:
        if not blob_url:
            return

        parsed_url = urlparse(blob_url)
        container_marker = f"/{STORAGE_CONTAINER}/"

        if container_marker not in parsed_url.path:
            return

        blob_name = parsed_url.path.split(
            container_marker,
            maxsplit=1,
        )[1]

        blob_client = self.container_client.get_blob_client(
            blob_name
        )

        blob_client.delete_blob(
            delete_snapshots="include"
        )

    def generate_read_sas_url(
        self,
        blob_url: str,
        expiry_minutes: int = 60,
    ) -> str:
        if not blob_url:
            return blob_url

        parsed_url = urlparse(blob_url)
        container_marker = f"/{STORAGE_CONTAINER}/"

        if container_marker not in parsed_url.path:
            raise ValueError(
                "The photo URL does not belong to the expected container."
            )

        blob_name = parsed_url.path.split(
            container_marker,
            maxsplit=1,
        )[1]

        credential = self.blob_service_client.credential

        if (
            credential is None
            or not hasattr(credential, "account_key")
        ):
            raise RuntimeError(
                "The storage account key is unavailable "
                "for SAS generation."
            )

        sas_token = generate_blob_sas(
            account_name=(
                self.blob_service_client.account_name
            ),
            container_name=STORAGE_CONTAINER,
            blob_name=blob_name,
            account_key=credential.account_key,
            permission=BlobSasPermissions(read=True),
            start=(
                datetime.now(timezone.utc)
                - timedelta(minutes=5)
            ),
            expiry=(
                datetime.now(timezone.utc)
                + timedelta(minutes=expiry_minutes)
            ),
        )

        clean_blob_url = (
            f"{parsed_url.scheme}://"
            f"{parsed_url.netloc}"
            f"{parsed_url.path}"
        )

        return f"{clean_blob_url}?{sas_token}"


blob_storage_service = BlobStorageService()