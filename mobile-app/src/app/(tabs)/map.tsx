import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import MapView, { Marker } from "react-native-maps";

import { useAuth } from "../../context/AuthContext";
import { getUserPets, Pet } from "../../services/api";
import PhoneLocationMarker from "../../components/PhoneLocationMarker";

const REFRESH_INTERVAL_MS = 5000;
const DISPLAY_TIMER_INTERVAL_MS = 5000;
const ONLINE_THRESHOLD_MINUTES = 2;

export default function MapScreen() {
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] =
    useState<number | null>(null);
  const [currentTime, setCurrentTime] =
    useState(Date.now());

  const mapRef = useRef<MapView | null>(null);
  const hasInitiallyFittedMap = useRef(false);

  const loadPets = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const data = await getUserPets(user.userId);

      setPets(data);
      setCurrentTime(Date.now());
    } catch (err) {
      console.error(
        "Unable to load pet locations:",
        err
      );
    }
  }, [user]);

  const petsWithLocations = pets.filter(
    (pet) =>
      pet.LatestLatitude !== null &&
      pet.LatestLongitude !== null
  );

  const selectedPet =
    selectedPetId === null
      ? null
      : pets.find(
          (pet) => pet.DeviceId === selectedPetId
        ) ?? null;

  useFocusEffect(
    useCallback(() => {
      loadPets();

      return () => {
        setSelectedPetId(null);
      };
    }, [loadPets])
  );

  // Fetch fresh pet locations every 5 seconds.
  useEffect(() => {
    if (!user) {
      return;
    }

    const interval = setInterval(() => {
      loadPets();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, loadPets]);

  // Update relative time labels every 5 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, DISPLAY_TIMER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Initially position the camera around all pets.
  useEffect(() => {
    if (
      petsWithLocations.length === 0 ||
      hasInitiallyFittedMap.current
    ) {
      return;
    }

    const coordinates = petsWithLocations.map(
      (pet) => ({
        latitude: pet.LatestLatitude!,
        longitude: pet.LatestLongitude!,
      })
    );

    const timeout = setTimeout(() => {
      if (coordinates.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: coordinates[0].latitude,
            longitude: coordinates[0].longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500
        );
      } else {
        mapRef.current?.fitToCoordinates(
          coordinates,
          {
            edgePadding: {
              top: 80,
              right: 60,
              bottom: 160,
              left: 60,
            },
            animated: true,
          }
        );
      }

      hasInitiallyFittedMap.current = true;
    }, 300);

    return () => clearTimeout(timeout);
  }, [petsWithLocations.length]);

  function handleMarkerPress(pet: Pet) {
    setSelectedPetId(pet.DeviceId);

    if (
      pet.LatestLatitude === null ||
      pet.LatestLongitude === null
    ) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: pet.LatestLatitude,
        longitude: pet.LatestLongitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      350
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        googleRenderer="LEGACY"
        zoomControlEnabled
        initialRegion={{
          latitude: 47.5615,
          longitude: -52.7126,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={() => setSelectedPetId(null)}
      >
        <PhoneLocationMarker />
        {petsWithLocations.map((pet) => {
          const markerColor =
            pet.MarkerColor ?? "#2563EB";

          return (
            <Marker
              key={`${pet.DeviceId}-${pet.PhotoUrl ?? "no-photo"}`}
              coordinate={{
                latitude: pet.LatestLatitude!,
                longitude: pet.LatestLongitude!,
              }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={(event) => {
                event.stopPropagation();
                handleMarkerPress(pet);
              }}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerIcon,
                    {
                      borderColor: markerColor,
                    },
                    pet.PhotoUrl && styles.photoMarkerIcon,
                    selectedPetId ===
                      pet.DeviceId && {
                      transform: [
                        { scale: 1.08 },
                      ],
                    },
                  ]}
                >
                  {pet.PhotoUrl ? (
                    <View style={styles.markerPhotoFrame}>
                      <Image
                        source={{ uri: pet.PhotoUrl }}
                        style={styles.markerPhoto}
                        resizeMode="cover"
                        fadeDuration={0}
                      />
                    </View>
                  ) : (
                    <Text style={styles.markerPlaceholder}>
                      🐾
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.markerPoint,
                    {
                      borderColor: markerColor,
                    },
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {selectedPet ? (
        <View style={styles.petPanel}>
          <Pressable
            style={styles.closeButton}
            onPress={() =>
              setSelectedPetId(null)
            }
            accessibilityRole="button"
            accessibilityLabel="Close pet information"
          >
            <Text style={styles.closeButtonText}>
              ×
            </Text>
          </Pressable>

          <View style={styles.panelHeader}>
            <View
              style={styles.petPhotoContainer}
            >
              {selectedPet.PhotoUrl ? (
                <Image
                  key={selectedPet.PhotoUrl}
                  source={{
                    uri: selectedPet.PhotoUrl,
                  }}
                  style={styles.petPhoto}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={
                    styles.photoPlaceholder
                  }
                >
                  🐾
                </Text>
              )}
            </View>

            <View style={styles.petInfo}>
              <Text style={styles.petName}>
                {selectedPet.DeviceName ??
                  "Unnamed Pet"}
              </Text>

              <Text
                style={[
                  styles.petStatus,
                  isOnline(
                    selectedPet.LatestReceivedAt,
                    currentTime
                  )
                    ? styles.onlineStatus
                    : styles.offlineStatus,
                ]}
              >
                {isOnline(
                  selectedPet.LatestReceivedAt,
                  currentTime
                )
                  ? "● Online"
                  : "● Offline"}
              </Text>

              <Text style={styles.lastUpdated}>
                {formatLastUpdated(
                  selectedPet.LatestReceivedAt,
                  currentTime
                )}
              </Text>
            </View>
          </View>

          {selectedPet.LatestAccuracyMeters !==
          null ? (
            <View style={styles.accuracyRow}>
              <Text
                style={styles.accuracyLabel}
              >
                Location accuracy
              </Text>

              <Text
                style={styles.accuracyValue}
              >
                About{" "}
                {Math.round(
                  selectedPet.LatestAccuracyMeters
                )}{" "}
                m
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function parseUtcDate(
  dateValue: string
): number {
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

  const lastReceivedTime =
    parseUtcDate(lastReceived);

  if (Number.isNaN(lastReceivedTime)) {
    return false;
  }

  const differenceMinutes =
    (currentTime - lastReceivedTime) /
    1000 /
    60;

  return (
    differenceMinutes >= 0 &&
    differenceMinutes <=
      ONLINE_THRESHOLD_MINUTES
  );
}

function formatLastUpdated(
  lastReceived: string | null,
  currentTime: number
): string {
  if (!lastReceived) {
    return "Waiting for first location";
  }

  const lastReceivedTime =
    parseUtcDate(lastReceived);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  markerContainer: {
    alignItems: "center",
  },

  markerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  markerPlaceholder: {
    fontSize: 25,
  },

  markerPhoto: {
    width: "100%",
    height: "100%",
  },

  photoMarkerIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },

  markerPhotoFrame: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#cbd5e1",
  },

  markerPoint: {
    width: 14,
    height: 14,
    backgroundColor: "white",
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#2563EB",
    transform: [{ rotate: "45deg" }],
    marginTop: -8,
    elevation: 4,
  },

  petPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  closeButton: {
    position: "absolute",
    top: 8,
    right: 12,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  closeButtonText: {
    color: "#64748b",
    fontSize: 28,
    lineHeight: 30,
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 28,
  },

  petPhotoContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 16,
  },

  petPhoto: {
    width: "100%",
    height: "100%",
  },

  photoPlaceholder: {
    fontSize: 32,
  },

  petInfo: {
    flex: 1,
  },

  petName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 3,
  },

  petStatus: {
    fontSize: 15,
    fontWeight: "700",
  },

  onlineStatus: {
    color: "#15803d",
  },

  offlineStatus: {
    color: "#b91c1c",
  },

  lastUpdated: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },

  accuracyRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 16,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  accuracyLabel: {
    color: "#64748b",
    fontSize: 14,
  },

  accuracyValue: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
  },
});
