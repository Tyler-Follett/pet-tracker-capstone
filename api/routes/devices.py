from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/devices", tags=["Devices"])


class DeviceCreate(BaseModel):
    deviceIdentifier: str
    claimCode: str | None = None
    deviceName: str | None = None


class DeviceClaim(BaseModel):
    userId: int
    claimCode: str
    deviceName: str | None = None


class DeviceNameUpdate(BaseModel):
    deviceName: str | None = None


@router.get("")
def get_devices():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT DeviceId, UserId, DeviceName, DeviceIdentifier, ClaimCode, IsActive, CreatedAt
            FROM Devices
        """))
        return [dict(row._mapping) for row in result]


@router.get("/{device_id}")
def get_device(device_id: int):
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT DeviceId, UserId, DeviceName, DeviceIdentifier, ClaimCode, IsActive, CreatedAt
            FROM Devices
            WHERE DeviceId = :deviceId
        """), {"deviceId": device_id}).fetchone()

        if result is None:
            raise HTTPException(status_code=404, detail="Device not found")

        return dict(result._mapping)


@router.post("")
def create_device(device: DeviceCreate):
    with engine.begin() as connection:
        result = connection.execute(text("""
            INSERT INTO Devices (DeviceName, DeviceIdentifier, ClaimCode)
            OUTPUT INSERTED.DeviceId
            VALUES (:deviceName, :deviceIdentifier, :claimCode)
        """), device.model_dump())

        return {"deviceId": result.scalar(), "message": "Device created"}


@router.post("/claim")
def claim_device(claim: DeviceClaim):
    with engine.begin() as connection:
        device = connection.execute(text("""
            SELECT DeviceId, UserId
            FROM Devices
            WHERE ClaimCode = :claimCode
        """), {"claimCode": claim.claimCode}).fetchone()

        if device is None:
            raise HTTPException(status_code=404, detail="Invalid claim code")

        if device.UserId is not None:
            raise HTTPException(status_code=400, detail="Device already claimed")

        connection.execute(text("""
            UPDATE Devices
            SET UserId = :userId,
                DeviceName = :deviceName
            WHERE DeviceId = :deviceId
        """), {
            "userId": claim.userId,
            "deviceName": claim.deviceName,
            "deviceId": device.DeviceId
        })

        return {"deviceId": device.DeviceId, "message": "Device claimed"}

@router.put("/{device_id}/name")
def update_device_name(device_id: int, update: DeviceNameUpdate):
    with engine.begin() as connection:
        result = connection.execute(text("""
            UPDATE Devices
            SET DeviceName = :deviceName
            WHERE DeviceId = :deviceId
        """), {
            "deviceName": update.deviceName,
            "deviceId": device_id
        })

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")

        return {
            "deviceId": device_id,
            "deviceName": update.deviceName,
            "message": "Device name updated"
        }