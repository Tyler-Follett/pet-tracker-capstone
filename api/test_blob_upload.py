import os

from azure.storage.blob import BlobServiceClient, ContentSettings
from dotenv import load_dotenv


load_dotenv()

connection_string = os.getenv("STORAGE_CONNECTION")
container_name = os.getenv("STORAGE_CONTAINER", "pet-images")


def upload_test_blob() -> None:
    if not connection_string:
        raise RuntimeError(
            "STORAGE_CONNECTION was not found in the environment."
        )

    blob_service_client = BlobServiceClient.from_connection_string(
        connection_string
    )

    blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob="tests/connection-test.txt",
    )

    test_content = (
        "This file was uploaded from the Pet Tracker FastAPI project."
    )

    blob_client.upload_blob(
        test_content,
        overwrite=True,
        content_settings=ContentSettings(
            content_type="text/plain"
        ),
    )

    print("Test blob uploaded successfully!")
    print(f"Blob name: {blob_client.blob_name}")
    print(f"Blob URL: {blob_client.url}")


if __name__ == "__main__":
    upload_test_blob()