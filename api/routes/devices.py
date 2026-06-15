from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("")
def get_devices():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT DeviceId, UserId, DeviceName, DeviceIdentifier, ClaimCode, IsActive, CreatedAt
            FROM Devices
        """))

        return [dict(row._mapping) for row in result]