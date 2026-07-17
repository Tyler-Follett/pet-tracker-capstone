import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import AppTextInput from "../../components/AppTextInput";
import PrimaryButton from "../../components/PrimaryButton";
import { getPet, Pet, renamePet, uploadPetPhoto,updatePetMarkerColor, } from "../../services/api";
const MARKER_COLORS = [
  { name: "Blue", value: "#2563EB" },
  { name: "Green", value: "#16A34A" },
  { name: "Orange", value: "#EA580C" },
  { name: "Purple", value: "#9333EA" },
  { name: "Red", value: "#DC2626" },
  { name: "Pink", value: "#DB2777" },
];

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [pet, setPet] = useState<Pet | null>(null);
  const [petName, setPetName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showTrackerDetails, setShowTrackerDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const deviceId = Number(id);
  const [isSavingMarkerColor, setIsSavingMarkerColor] =
  useState(false);

  useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 10000);

  return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  if (!Number.isInteger(deviceId)) {
    return;
  }

  const interval = setInterval(async () => {
    try {
      const updatedPet = await getPet(deviceId);

      setPet(updatedPet);
      setCurrentTime(Date.now());
    } catch (err) {
      console.error("Unable to refresh pet status:", err);
    }
  }, 15000);

  return () => clearInterval(interval);
  }, [deviceId]);

  useEffect(() => {
    async function loadPet() {
      if (!Number.isInteger(deviceId)) {
        setError("Invalid pet.");
        setIsLoading(false);
        return;
      }

      try {
        setError("");

        const data = await getPet(deviceId);

        setPet(data);
        setPetName(data.DeviceName ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load pet details."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPet();
  }, [deviceId]);

  async function handleMarkerColorChange(
    markerColor: string
  ) {
    if (
      isSavingMarkerColor ||
      pet?.MarkerColor === markerColor
    ) {
      return;
    }

    try {
      setError("");
      setIsSavingMarkerColor(true);

      await updatePetMarkerColor(
        deviceId,
        markerColor
      );

      setPet((currentPet) =>
        currentPet
          ? {
              ...currentPet,
              MarkerColor: markerColor,
            }
          : currentPet
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update marker colour."
      );
    } finally {
      setIsSavingMarkerColor(false);
    }
  }

  async function handleRename() {
    const newName = petName.trim();

    if (!newName) {
      setError("Please enter a pet name.");
      return;
    }

    try {
      setError("");
      setIsSaving(true);

      await renamePet(deviceId, newName);

      setPet((currentPet) =>
        currentPet
          ? {
              ...currentPet,
              DeviceName: newName,
            }
          : currentPet
      );

      setIsRenaming(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to rename pet."
      );
    } finally {
      setIsSaving(false);
    }
  }

async function handleChoosePhoto() {

  try {
    setError("");

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError(
        "Photo library permission is required to choose a pet photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });


    if (result.canceled) {
      return;
    }

    if (!result.assets || result.assets.length === 0) {
      setError("No image was returned by the photo picker.");
      return;
    }

    const selectedImage = result.assets[0];

    const mimeType =
      selectedImage.mimeType ??
      getMimeTypeFromFileName(selectedImage.fileName);

    const fileName =
      selectedImage.fileName ??
      `pet-${deviceId}.${getExtensionFromMimeType(mimeType)}`;

    setIsUploadingPhoto(true);

    await uploadPetPhoto(
      deviceId,
      selectedImage.uri,
      mimeType,
      fileName
    );

    const updatedPet = await getPet(deviceId);

    setPet(updatedPet);
  } catch (err) {
    console.error("Photo upload error:", err);

    setError(
      err instanceof Error
        ? err.message
        : "Unable to upload pet photo."
    );
  } finally {
    setIsUploadingPhoto(false);
  }
}

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading pet details...</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.error}>{error || "Pet not found."}</Text>

        <PrimaryButton
          title="Go Back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

    return (
    <View style={styles.container}>
        <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>‹ Back</Text>
        </Pressable>

        <View style={styles.heroSection}>
          <Pressable
            style={styles.photoPlaceholder}
            onPress={handleChoosePhoto}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator size="large" />
            ) : pet.PhotoUrl ? (
              <Image
                source={{ uri: pet.PhotoUrl }}
                style={styles.petPhoto}
              />
            ) : (
              <Text style={styles.photoPlaceholderText}>🐾</Text>
            )}
          </Pressable>

          <Text style={styles.photoHint}>
            {pet.PhotoUrl ? "Tap photo to replace" : "Tap to add photo"}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.title}>
            {pet.DeviceName ?? "Unnamed Pet"}
        </Text>

          <View
            style={[
              styles.statusBadge,
              isOnline(pet.LatestReceivedAt, currentTime)
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOnline(pet.LatestReceivedAt, currentTime)
                  ? styles.activeText
                  : styles.inactiveText,
              ]}
            >
              {isOnline(pet.LatestReceivedAt, currentTime)
                ? "● Online"
                : "● Offline"}
            </Text>
          </View>

          <Text style={styles.detailsLastUpdated}>
            {formatLastUpdated(
              pet.LatestReceivedAt,
              currentTime
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.trackerHeader}
            onPress={() =>
              setShowTrackerDetails((currentValue) => !currentValue)
            }
            accessibilityRole="button"
            accessibilityLabel={
              showTrackerDetails
                ? "Collapse tracker details"
                : "Expand tracker details"
            }
            accessibilityState={{
              expanded: showTrackerDetails,
            }}
          >
            <Text style={styles.cardTitle}>Tracker Details</Text>

            <Text style={styles.expandIcon}>
              {showTrackerDetails ? "⌃" : "⌄"}
            </Text>
          </Pressable>

          {showTrackerDetails ? (
            <View style={styles.trackerDetailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Tracker identifier</Text>
                <Text style={styles.value}>
                  {pet.DeviceIdentifier}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Pet</Text>

        {isRenaming ? (
            <>
            <AppTextInput
                placeholder="Enter pet name"
                value={petName}
                onChangeText={setPetName}
                autoCapitalize="words"
                maxLength={100}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
                title={isSaving ? "Saving..." : "Save Name"}
                onPress={handleRename}
            />

            <Pressable
                onPress={() => {
                setPetName(pet.DeviceName ?? "");
                setError("");
                setIsRenaming(false);
                }}
            >
                <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
            </>
        ) : (
            <>
            <PrimaryButton
                title="Rename Pet"
                onPress={() => setIsRenaming(true)}
            />

            <Pressable
            style={styles.secondaryAction}
            onPress={() =>
                router.push({
                pathname: "/map",
                params: {
                    deviceId: pet.DeviceId.toString(),
                },
                })
            }
            >

              <View style={styles.markerColorSection}>
                <Text style={styles.markerColorLabel}>
                  Map marker colour
                </Text>

                <View style={styles.markerColorOptions}>
                  {MARKER_COLORS.map((color) => {
                    const isSelected =
                      (pet.MarkerColor ?? "#2563EB") ===
                      color.value;

                    return (
                      <Pressable
                        key={color.value}
                        style={[
                          styles.markerColorButton,
                          {
                            backgroundColor: color.value,
                          },
                          isSelected &&
                            styles.selectedMarkerColorButton,
                        ]}
                        onPress={() =>
                          handleMarkerColorChange(color.value)
                        }
                        disabled={isSavingMarkerColor}
                      >
                        {isSelected ? (
                          <Text style={styles.markerColorCheck}>
                            ✓
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {isSavingMarkerColor ? (
                  <Text style={styles.markerColorSaving}>
                    Saving colour...
                  </Text>
                ) : null}
              </View>
              
            <Text style={styles.secondaryActionText}>View Live Map</Text>
            </Pressable>
            
            <Pressable
            style={styles.secondaryAction}
            onPress={() =>
                router.push({
                pathname: "/history",
                params: {
                    deviceId: pet.DeviceId.toString(),
                },
                })
            }
            >
            <Text style={styles.secondaryActionText}>View History</Text>
            </Pressable>
            </>
        )}
        </View>
    </View>
    );
}

const ONLINE_THRESHOLD_MINUTES = 2;

function parseUtcDate(dateValue: string): number {
  const hasTimezone =
    dateValue.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(dateValue);

  const normalizedDate = hasTimezone
    ? dateValue
    : `${dateValue}Z`;

  return new Date(normalizedDate).getTime();
}

function isOnline(
  lastReceived: string | null,
  currentTime: number
): boolean {
  if (!lastReceived) {
    return false;
  }

  const lastReceivedTime = parseUtcDate(lastReceived);

  if (Number.isNaN(lastReceivedTime)) {
    return false;
  }

  const differenceMinutes =
    (currentTime - lastReceivedTime) / 1000 / 60;

  return (
    differenceMinutes >= 0 &&
    differenceMinutes <= ONLINE_THRESHOLD_MINUTES
  );
}

function formatLastUpdated(
  lastReceived: string | null,
  currentTime: number
): string {
  if (!lastReceived) {
    return "Waiting for first location";
  }

  const lastReceivedTime = parseUtcDate(lastReceived);

  if (Number.isNaN(lastReceivedTime)) {
    return "Last update unavailable";
  }

  const differenceSeconds = Math.max(
    0,
    Math.floor(
      (currentTime - lastReceivedTime) / 1000
    )
  );

  if (differenceSeconds < 60) {
    return `Last updated ${differenceSeconds} seconds ago`;
  }

  const differenceMinutes = Math.floor(
    differenceSeconds / 60
  );

  if (differenceMinutes < 60) {
    return `Last updated ${differenceMinutes} minute${
      differenceMinutes === 1 ? "" : "s"
    } ago`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  return `Last updated ${differenceHours} hour${
    differenceHours === 1 ? "" : "s"
  } ago`;
}

function getMimeTypeFromFileName(
  fileName: string | null | undefined
): string {
  const lowerName = fileName?.toLowerCase() ?? "";

  if (lowerName.endsWith(".png")) {
    return "image/png";
  }

  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "#f5f7fa",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 12,
    textAlign: "center",
    color: "#555",
  },
  backLink: {
    marginTop: 40,
    marginBottom: 10,
    color: "#2563eb",
    fontSize: 17,
    fontWeight: "600",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "white",
    elevation: 3,
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: "#dcfce7",
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeText: {
    color: "#15803d",
  },
  inactiveText: {
    color: "#b91c1c",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailRow: {
    marginBottom: 4,
  },
  label: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 17,
    fontWeight: "600",
  },
  section: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  secondaryAction: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryActionText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontWeight: "600",
  },
  cancelLink: {
    color: "#2563eb",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  petPhoto: {
  width: "100%",
  height: "100%",
  borderRadius: 60,
  },
  photoHint: {
    color: "#64748b",
    fontSize: 14,
    marginTop: -6,
    marginBottom: 12,
  },
  trackerHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  },
  expandIcon: {
    color: "#64748b",
    fontSize: 24,
    fontWeight: "700",
  },
  trackerDetailsContent: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  detailsLastUpdated: {
  color: "#64748b",
  fontSize: 14,
  marginTop: 8,
},
markerColorSection: {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#d1d5db",
},

markerColorLabel: {
  fontSize: 16,
  fontWeight: "700",
  marginBottom: 14,
},

markerColorOptions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
},

markerColorButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 3,
  borderColor: "transparent",
},

selectedMarkerColorButton: {
  borderColor: "#111827",
},

markerColorCheck: {
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
},

markerColorSaving: {
  color: "#64748b",
  fontSize: 13,
  marginTop: 10,
},
});