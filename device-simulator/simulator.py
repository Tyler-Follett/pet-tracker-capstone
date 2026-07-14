import random
import time
from datetime import datetime, timezone

import requests


API_URL = "https://pet-tracker-api-capstone-cgh4gjhtdwevf9dq.canadacentral-01.azurewebsites.net/locations"
DEVICE_IDENTIFIER = "TEST-DEVICE-002"


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
            "recordedAt": datetime.now(timezone.utc).isoformat()
        }

    def upload_location(self, location):
        response = requests.post(API_URL, json=location, timeout=10)

        if response.status_code == 200:
            print("Uploaded:", location)
        else:
            print("Upload failed:", response.status_code, response.text)

    def run(self, interval_seconds=5):
        print("Starting device simulator...")
        print(f"Device: {self.device_identifier}")

        while True:
            location = self.generate_location()
            self.upload_location(location)
            time.sleep(interval_seconds)


if __name__ == "__main__":
    simulator = DeviceSimulator(
        device_identifier=DEVICE_IDENTIFIER,
        latitude=47.5615,
        longitude=-52.7126
    )

    simulator.run()