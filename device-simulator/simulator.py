import logging
import os
import random
import time
from datetime import datetime, timezone
from threading import Event, Thread

import requests
from dotenv import load_dotenv


load_dotenv()

API_URL = os.getenv("API_URL")

if not API_URL:
    raise RuntimeError("API_URL was not found in the environment.")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)


class DeviceSimulator:
    def __init__(
        self,
        device_identifier: str,
        latitude: float,
        longitude: float,
    ) -> None:
        self.device_identifier = device_identifier
        self.latitude = latitude
        self.longitude = longitude
        self.session = requests.Session()

    def generate_location(self) -> dict:
        self.latitude += random.uniform(-0.00015, 0.00015)
        self.longitude += random.uniform(-0.00015, 0.00015)

        return {
            "deviceIdentifier": self.device_identifier,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "accuracyMeters": round(
                random.uniform(3.0, 8.0),
                2,
            ),
            "recordedAt": datetime.now(
                timezone.utc
            ).isoformat(),
        }

    def upload_location(self, location: dict) -> None:
        try:
            response = self.session.post(
                API_URL,
                json=location,
                timeout=10,
            )

            response.raise_for_status()

            logger.info(
                "[%s] Uploaded location: %s, %s",
                self.device_identifier,
                location["latitude"],
                location["longitude"],
            )

        except requests.RequestException as error:
            logger.error(
                "[%s] Upload failed: %s",
                self.device_identifier,
                error,
            )

    def run(
        self,
        stop_event: Event,
        interval_seconds: float = 5,
    ) -> None:
        logger.info(
            "Starting simulator for %s",
            self.device_identifier,
        )

        while not stop_event.is_set():
            location = self.generate_location()
            self.upload_location(location)

            stop_event.wait(interval_seconds)

        logger.info(
            "Stopped simulator for %s",
            self.device_identifier,
        )

        self.session.close()


def main() -> None:
    stop_event = Event()

    devices = [
        DeviceSimulator(
            device_identifier="DEMO-DEVICE-001",
            latitude=47.5600,
            longitude=-52.7100,
        ),
        DeviceSimulator(
            device_identifier="DEMO-DEVICE-002",
            latitude=47.5595,
            longitude=-52.7095,
        ),
    ]

    threads = [
        Thread(
            target=device.run,
            args=(stop_event,),
            kwargs={"interval_seconds": 5},
            daemon=True,
        )
        for device in devices
    ]

    for thread in threads:
        thread.start()

    try:
        while any(thread.is_alive() for thread in threads):
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Shutdown requested.")
        stop_event.set()

    for thread in threads:
        thread.join()


if __name__ == "__main__":
    main()