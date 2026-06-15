from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/location-updates", tags=["Location Updates"])


@router.get("")
def get_location_updates():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT LocationUpdateId, DeviceId, Latitude, Longitude, AccuracyMeters, RecordedAt, ReceivedAt
            FROM LocationUpdates
        """))

        return [dict(row._mapping) for row in result]