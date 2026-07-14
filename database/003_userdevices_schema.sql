CREATE TABLE UserDevices (
    UserDeviceId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    DeviceId INT NOT NULL,
    AddedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_UserDevices_Users
        FOREIGN KEY (UserId) REFERENCES Users(UserId),

    CONSTRAINT FK_UserDevices_Devices
        FOREIGN KEY (DeviceId) REFERENCES Devices(DeviceId),

    CONSTRAINT UQ_UserDevices_User_Device
        UNIQUE (UserId, DeviceId)
);