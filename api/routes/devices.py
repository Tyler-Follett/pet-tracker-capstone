from fastapi import APIRouter, File, HTTPException, UploadFile
from services.blob_storage import blob_storage_service
from pydantic import BaseModel
from sqlalchemy import text

from database import engine


router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)


class DeviceCreate(BaseModel):
    deviceIdentifier: str
    claimCode: str | None = None
    deviceName: str | None = None


class DeviceClaim(BaseModel):
    userId: int
    claimCode: str


class DeviceNameUpdate(BaseModel):
    deviceName: str | None = None


@router.get("")
def get_devices():
    """
    Administrative-style endpoint that returns all devices.
    Claim codes are intentionally not returned.
    """
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT
                DeviceId,
                DeviceName,
                DeviceIdentifier,
                IsActive,
                CreatedAt,
                PhotoUrl
            FROM Devices
            ORDER BY CreatedAt DESC
        """))

        return [dict(row._mapping) for row in result]


@router.get("/user/{user_id}")
def get_user_devices(user_id: int):
    """
    Returns every pet/tracker associated with a particular user.
    """
    with engine.connect() as connection:
        user_exists = connection.execute(text("""
            SELECT 1
            FROM Users
            WHERE UserId = :userId
        """), {
            "userId": user_id
        }).first()

        if user_exists is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        result = connection.execute(text("""
            SELECT
                d.DeviceId,
                d.DeviceName,
                d.DeviceIdentifier,
                d.PhotoUrl,
                d.IsActive,
                d.CreatedAt,
                ud.AddedAt,
                latest.Latitude AS LatestLatitude,
                latest.Longitude AS LatestLongitude,
                latest.AccuracyMeters AS LatestAccuracyMeters,
                latest.ReceivedAt AS LatestReceivedAt
            FROM UserDevices ud
            INNER JOIN Devices d
                ON d.DeviceId = ud.DeviceId
            OUTER APPLY (
                SELECT TOP 1
                    lu.Latitude,
                    lu.Longitude,
                    lu.AccuracyMeters,
                    lu.ReceivedAt
                FROM LocationUpdates lu
                WHERE lu.DeviceId = d.DeviceId
                ORDER BY lu.ReceivedAt DESC
            ) latest
            WHERE ud.UserId = :userId
            ORDER BY ud.AddedAt DESC
        """), {
            "userId": user_id
        })

        devices = [dict(row._mapping) for row in result]

        for device in devices:
            if device["PhotoUrl"]:
                device["PhotoUrl"] = (
                    blob_storage_service.generate_read_sas_url(
                        device["PhotoUrl"]
                    )
                )

        return devices


@router.get("/{device_id}")
def get_device(device_id: int):
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT
                d.DeviceId,
                d.DeviceName,
                d.DeviceIdentifier,
                d.IsActive,
                d.CreatedAt,
                d.PhotoUrl,
                latest.ReceivedAt AS LatestReceivedAt
            FROM Devices d
            OUTER APPLY (
                SELECT TOP 1
                    lu.ReceivedAt
                FROM LocationUpdates lu
                WHERE lu.DeviceId = d.DeviceId
                ORDER BY lu.ReceivedAt DESC
            ) latest
            WHERE d.DeviceId = :deviceId
        """), {
            "deviceId": device_id
        }).mappings().first()

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Device not found"
            )

        device = dict(result)

        if device["PhotoUrl"]:
            device["PhotoUrl"] = (
                blob_storage_service.generate_read_sas_url(
                    device["PhotoUrl"]
                )
            )

        return device


@router.post("")
def create_device(device: DeviceCreate):
    """
    Creates a tracker record. This would normally be performed when
    preparing/registering the physical tracker, not by an app user.
    """
    with engine.begin() as connection:
        existing_device = connection.execute(text("""
            SELECT DeviceId
            FROM Devices
            WHERE DeviceIdentifier = :deviceIdentifier
        """), {
            "deviceIdentifier": device.deviceIdentifier
        }).first()

        if existing_device is not None:
            raise HTTPException(
                status_code=400,
                detail="A device with this identifier already exists"
            )

        result = connection.execute(text("""
            INSERT INTO Devices (
                DeviceName,
                DeviceIdentifier,
                ClaimCode
            )
            OUTPUT INSERTED.DeviceId
            VALUES (
                :deviceName,
                :deviceIdentifier,
                :claimCode
            )
        """), device.model_dump())

        return {
            "deviceId": result.scalar(),
            "message": "Device created"
        }


@router.post("/claim")
def claim_device(claim: DeviceClaim):
    """
    Associates an existing tracker with a user.

    The claim code is reusable, allowing multiple household members
    to add the same tracker. A user cannot add the same tracker twice.
    """
    claim_code = claim.claimCode.strip()

    if not claim_code:
        raise HTTPException(
            status_code=400,
            detail="Pairing code is required"
        )

    with engine.begin() as connection:
        user = connection.execute(text("""
            SELECT UserId
            FROM Users
            WHERE UserId = :userId
        """), {
            "userId": claim.userId
        }).fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        device = connection.execute(text("""
            SELECT
                DeviceId,
                DeviceName,
                DeviceIdentifier,
                IsActive
            FROM Devices
            WHERE UPPER(LTRIM(RTRIM(ClaimCode))) = UPPER(:claimCode)
        """), {
            "claimCode": claim_code
        }).mappings().first()

        if device is None:
            raise HTTPException(
                status_code=404,
                detail="Invalid pairing code"
            )

        existing_association = connection.execute(text("""
            SELECT UserDeviceId
            FROM UserDevices
            WHERE UserId = :userId
              AND DeviceId = :deviceId
        """), {
            "userId": claim.userId,
            "deviceId": device["DeviceId"]
        }).first()

        if existing_association is not None:
            raise HTTPException(
                status_code=400,
                detail="This pet has already been added to your account"
            )

        connection.execute(text("""
            INSERT INTO UserDevices (
                UserId,
                DeviceId
            )
            VALUES (
                :userId,
                :deviceId
            )
        """), {
            "userId": claim.userId,
            "deviceId": device["DeviceId"]
        })

        return {
            "deviceId": device["DeviceId"],
            "deviceName": device["DeviceName"],
            "deviceIdentifier": device["DeviceIdentifier"],
            "isActive": device["IsActive"],
            "message": "Pet added successfully"
        }


@router.put("/{device_id}/name")
def update_device_name(
    device_id: int,
    update: DeviceNameUpdate
):
    """
    Renames the tracker/pet. Since the name is stored on Devices,
    every household member will see the same pet name.
    """
    device_name = (
        update.deviceName.strip()
        if update.deviceName is not None
        else None
    )

    if not device_name:
        raise HTTPException(
            status_code=400,
            detail="Pet name is required"
        )

    with engine.begin() as connection:
        result = connection.execute(text("""
            UPDATE Devices
            SET DeviceName = :deviceName
            WHERE DeviceId = :deviceId
        """), {
            "deviceName": device_name,
            "deviceId": device_id
        })

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Device not found"
            )

        return {
            "deviceId": device_id,
            "deviceName": device_name,
            "message": "Pet name updated"
        }

@router.post("/{device_id}/photo")
async def upload_device_photo(
    device_id: int,
    image: UploadFile = File(...)
):
    """
    Uploads or replaces a pet's profile photo.

    The image is stored in Azure Blob Storage, while its URL is stored
    in the Devices table.
    """
    with engine.connect() as connection:
        device = connection.execute(text("""
            SELECT
                DeviceId,
                PhotoUrl
            FROM Devices
            WHERE DeviceId = :deviceId
        """), {
            "deviceId": device_id
        }).mappings().first()

    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    try:
        new_photo_url = await blob_storage_service.upload_pet_photo(
            device_id=device_id,
            image=image,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to upload pet photo"
        ) from exc

    old_photo_url = device["PhotoUrl"]

    try:
        with engine.begin() as connection:
            result = connection.execute(text("""
                UPDATE Devices
                SET PhotoUrl = :photoUrl
                WHERE DeviceId = :deviceId
            """), {
                "photoUrl": new_photo_url,
                "deviceId": device_id
            })

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Device not found"
                )
    except Exception:
        try:
            blob_storage_service.delete_blob_from_url(
                new_photo_url
            )
        except Exception:
            pass

        raise

    if old_photo_url:
        try:
            blob_storage_service.delete_blob_from_url(
                old_photo_url
            )
        except Exception:
            # The database already points to the new image, so failure
            # to remove the old blob should not fail the request.
            pass

    return {
        "deviceId": device_id,
        "photoUrl": new_photo_url,
        "message": "Pet photo updated"
    }