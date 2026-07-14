import os

from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv


load_dotenv()

connection_string = os.getenv("STORAGE_CONNECTION")
container_name = os.getenv("STORAGE_CONTAINER", "pet-images")


def test_blob_connection() -> None:
    if not connection_string:
        raise RuntimeError(
            "STORAGE_CONNECTION was not found in the environment."
        )

    blob_service_client = BlobServiceClient.from_connection_string(
        connection_string
    )

    container_client = blob_service_client.get_container_client(
        container_name
    )

    if not container_client.exists():
        raise RuntimeError(
            f"The container '{container_name}' does not exist."
        )

    print("Azure Blob Storage connection successful!")
    print(f"Container found: {container_name}")


if __name__ == "__main__":
    test_blob_connection()