import random
import time
from datetime import datetime, timezone
from threading import Thread

import requests


API_URL = (
    "https://pet-tracker-api-capstone-"
    "cgh4gjhtdwevf9dq.canadacentral-01.azurewebsites.net/locations"
)


class DeviceSimulator:
    def __init__(self, device_identifier, latitude, longitude):
        self.device_identifier = device_identifier
        self.latitude = latitude
        self.longitude = longitude

    def generate_location(self):
        self.latitude += random.uniform(-0.00015, 0.00015)
        self.longitude += random.uniform(-0.00015, 0.00015)

        return {
            "deviceIdentifier": self.device_identifier,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "accuracyMeters": round(random.uniform(3.0, 8.0), 2),
            "recordedAt": datetime.now(timezone.utc).isoformat(),
        }

    def upload_location(self, location):
        try:
            response = requests.post(API_URL, json=location, timeout=10)

            if response.status_code == 200:
                print(
                    f"[{self.device_identifier}] Uploaded: "
                    f"{location['latitude']}, {location['longitude']}"
                )
            else:
                print(
                    f"[{self.device_identifier}] Upload failed: "
                    f"{response.status_code} {response.text}"
                )

        except requests.RequestException as error:
            print(f"[{self.device_identifier}] Request error: {error}")

    def run(self, interval_seconds=5):
        print(f"Starting simulator for {self.device_identifier}...")

        while True:
            location = self.generate_location()
            self.upload_location(location)
            time.sleep(interval_seconds)


if __name__ == "__main__":
    device_1 = DeviceSimulator(
        device_identifier="TEST-DEVICE-001",
        latitude=47.5493,
        longitude=-52.7413,
    )

    device_2 = DeviceSimulator(
        device_identifier="TEST-DEVICE-002",
        latitude=47.5492,
        longitude=-52.7409,
    )

    device_1_thread = Thread(
        target=device_1.run,
        kwargs={"interval_seconds": 5},
        daemon=True,
    )

    device_2_thread = Thread(
        target=device_2.run,
        kwargs={"interval_seconds": 5},
        daemon=True,
    )

    device_1_thread.start()
    device_2_thread.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping device simulators...")