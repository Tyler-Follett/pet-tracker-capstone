CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(100) NULL,
    LastName NVARCHAR(100) NULL,
    Email NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Devices (
    DeviceId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NULL,
    DeviceName NVARCHAR(100) NULL,
    DeviceIdentifier NVARCHAR(100) NOT NULL UNIQUE,
    ClaimCode NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Devices_Users
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
);

CREATE TABLE LocationUpdates (
    LocationUpdateId INT IDENTITY(1,1) PRIMARY KEY,
    DeviceId INT NOT NULL,
    Latitude DECIMAL(9,6) NOT NULL,
    Longitude DECIMAL(9,6) NOT NULL,
    AccuracyMeters DECIMAL(8,2) NULL,
    RecordedAt DATETIME2 NOT NULL,
    ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_LocationUpdates_Devices
        FOREIGN KEY (DeviceId)
        REFERENCES Devices(DeviceId)
);