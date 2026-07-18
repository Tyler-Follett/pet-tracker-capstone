import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

const API_BASE_URL =
  "https://pet-tracker-api-capstone-cgh4gjhtdwevf9dq.canadacentral-01.azurewebsites.net";

  
console.log("API URL:", API_BASE_URL);

export type LoginResponse = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type Pet = {
  DeviceId: number;
  DeviceName: string | null;
  DeviceIdentifier: string;
  PhotoUrl: string | null;
  IsActive: boolean;
  CreatedAt: string;
  AddedAt: string;
  LatestLatitude: number | null;
  LatestLongitude: number | null;
  LatestAccuracyMeters: number | null;
  LatestReceivedAt: string | null;
  MarkerColor: string | null;
};

export type LocationUpdate = {
  LocationUpdateId: number;
  DeviceId: number;
  Latitude: number;
  Longitude: number;
  AccuracyMeters: number | null;
  RecordedAt: string;
  ReceivedAt: string;
};

export async function getPetLocationHistory(
  deviceId: number
): Promise<LocationUpdate[]> {
  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/locations`
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      getErrorMessage(
        errorData,
        "Unable to load location history."
      )
    );
  }

  return response.json();
}

export async function getPet(deviceId: number): Promise<Pet> {
  const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      getErrorMessage(errorData, "Unable to load pet details.")
    );
  }

  return response.json();
}

export async function renamePet(
  deviceId: number,
  deviceName: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/name`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      getErrorMessage(errorData, "Unable to rename pet.")
    );
  }
}

export async function getUserPets(userId: number): Promise<Pet[]> {
  const response = await fetch(`${API_BASE_URL}/devices/user/${userId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      getErrorMessage(errorData, "Unable to load pets.")
    );
  }

  return response.json();
}

function getErrorMessage(errorData: unknown, fallbackMessage: string): string {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "detail" in errorData
  ) {
    const detail = (errorData as { detail: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const firstError = detail[0];

      if (
        typeof firstError === "object" &&
        firstError !== null &&
        "msg" in firstError &&
        typeof firstError.msg === "string"
      ) {
        return firstError.msg.replace(/^Value error, /, "");
      }
    }
  }

  return fallbackMessage;
}

export async function addPet(
  userId: number,
  claimCode: string
) {
  const response = await fetch(`${API_BASE_URL}/devices/claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      claimCode,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      getErrorMessage(errorData, "Unable to add pet.")
    );
  }

  return await response.json();
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(getErrorMessage(errorData, "Login failed."));
}

  return response.json();
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      password,
    }),
  });

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(getErrorMessage(errorData, "Registration failed."));
  }
}
export async function updatePetMarkerColor(
  deviceId: number,
  markerColor: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/marker-color`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        markerColor,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      getErrorMessage(
        errorData,
        "Unable to update marker color."
      )
    );
  }
}

export async function uploadPetPhoto(
  deviceId: number,
  imageUri: string,
  mimeType: string,
  fileName: string
): Promise<{ photoUrl: string }> {
  const formData = new FormData();

  const imageFile = new File(imageUri);

  formData.append("image", imageFile, fileName);

  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/photo`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      getErrorMessage(
        errorData,
        "Unable to upload pet photo."
      )
    );
  }

  return response.json();
}