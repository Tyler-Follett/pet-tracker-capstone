INSERT INTO Users (
    FirstName,
    LastName,
    Email
)
VALUES (
    'Test',
    'User',
    NULL
);

INSERT INTO Devices (
    UserId,
    DeviceName,
    DeviceIdentifier,
    ClaimCode
)
VALUES (
    1,
    'Buddy',
    'TEST-DEVICE-001',
    '12ABCD'
);

INSERT INTO LocationUpdates (
    DeviceId,
    Latitude,
    Longitude,
    AccuracyMeters,
    RecordedAt
)
VALUES (
    1,
    47.5615,
    -52.7126,
    5.5,
    SYSUTCDATETIME()
);