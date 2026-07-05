from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine

router = APIRouter(tags=["Location Updates"])


class LocationCreate(BaseModel):
    deviceIdentifier: str
    latitude: float
    longitude: float
    accuracyMeters: float | None = None
    recordedAt: datetime | None = None


@router.get("/location-updates")
def get_location_updates():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT LocationUpdateId, DeviceId, Latitude, Longitude, AccuracyMeters, RecordedAt, ReceivedAt
            FROM LocationUpdates
            ORDER BY ReceivedAt DESC
        """))
        return [dict(row._mapping) for row in result]


@router.post("/locations")
def create_location(location: LocationCreate):
    recorded_at = location.recordedAt or datetime.utcnow()

    with engine.begin() as connection:
        device = connection.execute(text("""
            SELECT DeviceId
            FROM Devices
            WHERE DeviceIdentifier = :deviceIdentifier
              AND IsActive = 1
        """), {"deviceIdentifier": location.deviceIdentifier}).fetchone()

        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")

        result = connection.execute(text("""
            INSERT INTO LocationUpdates (
                DeviceId,
                Latitude,
                Longitude,
                AccuracyMeters,
                RecordedAt
            )
            OUTPUT INSERTED.LocationUpdateId
            VALUES (
                :deviceId,
                :latitude,
                :longitude,
                :accuracyMeters,
                :recordedAt
            )
        """), {
            "deviceId": device.DeviceId,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "accuracyMeters": location.accuracyMeters,
            "recordedAt": recorded_at
        })

        return {
            "locationUpdateId": result.scalar(),
            "message": "Location uploaded"
        }


@router.get("/devices/{device_id}/latest-location")
def get_latest_location(device_id: int):
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT TOP 1 LocationUpdateId, DeviceId, Latitude, Longitude, AccuracyMeters, RecordedAt, ReceivedAt
            FROM LocationUpdates
            WHERE DeviceId = :deviceId
            ORDER BY RecordedAt DESC
        """), {"deviceId": device_id}).fetchone()

        if result is None:
            raise HTTPException(status_code=404, detail="No location found for this device")

        return dict(result._mapping)


@router.get("/devices/{device_id}/locations")
def get_device_locations(device_id: int):
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT LocationUpdateId, DeviceId, Latitude, Longitude, AccuracyMeters, RecordedAt, ReceivedAt
            FROM LocationUpdates
            WHERE DeviceId = :deviceId
            ORDER BY RecordedAt DESC
        """), {"deviceId": device_id})

        return [dict(row._mapping) for row in result]