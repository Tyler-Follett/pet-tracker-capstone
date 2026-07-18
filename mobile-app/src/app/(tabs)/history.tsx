import { useCallback, useEffect, useMemo, useRef, useState,Fragment } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import MapView, {
  Marker,
  Polyline,
} from "react-native-maps";

import { useAuth } from "../../context/AuthContext";
import {
  getPetLocationHistory,
  getUserPets,
  LocationUpdate,
  Pet,
} from "../../services/api";

const DEFAULT_MARKER_COLOR = "#2563EB";

type TimeRangeOption = {
  label: string;
  milliseconds: number | null;
};

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  {
    label: "1 Hour",
    milliseconds: 60 * 60 * 1000,
  },
  {
    label: "6 Hours",
    milliseconds: 6 * 60 * 60 * 1000,
  },
  {
    label: "24 Hours",
    milliseconds: 24 * 60 * 60 * 1000,
  },
  {
    label: "7 Days",
    milliseconds: 7 * 24 * 60 * 60 * 1000,
  },
  {
    label: "All",
    milliseconds: null,
  },
];

type PetHistory = {
  pet: Pet;
  locations: LocationUpdate[];
};

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export default function HistoryScreen() {
  const { user } = useAuth();

  const { deviceId } = useLocalSearchParams<{
    deviceId?: string | string[];
  }>();

  const mapRef = useRef<MapView | null>(null);

  const [petHistories, setPetHistories] = useState<PetHistory[]>([]);
  const [selectedPetId, setSelectedPetId] =
    useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<TimeRangeOption>(
      TIME_RANGE_OPTIONS[2]
    );

  const routeDeviceId = useMemo(() => {
    const value = Array.isArray(deviceId)
      ? deviceId[0]
      : deviceId;

    if (!value) {
      return null;
    }

    const parsedDeviceId = Number(value);

    return Number.isInteger(parsedDeviceId)
      ? parsedDeviceId
      : null;
  }, [deviceId]);

  const filteredPetHistories = useMemo(() => {
    const cutoffTime =
      selectedTimeRange.milliseconds === null
        ? null
        : Date.now() -
          selectedTimeRange.milliseconds;

    return petHistories.map((history) => {
      const filteredLocations =
        cutoffTime === null
          ? history.locations
          : history.locations.filter(
              (location) => {
                const recordedTime = parseUtcDate(
                  location.RecordedAt
                ).getTime();

                return (
                  !Number.isNaN(recordedTime) &&
                  recordedTime >= cutoffTime
                );
              }
            );

      return {
        ...history,
        locations: filteredLocations,
      };
    });
  }, [petHistories, selectedTimeRange]);

  const historiesWithLocations = useMemo(
    () =>
      filteredPetHistories.filter(
        (history) =>
          history.locations.length > 0
      ),
    [filteredPetHistories]
  );

  const selectedHistory = useMemo(() => {
    if (selectedPetId === null) {
      return null;
    }

    return (
      filteredPetHistories.find(
        (history) =>
          history.pet.DeviceId === selectedPetId
      ) ?? null
    );
  }, [
    filteredPetHistories,
    selectedPetId,
  ]);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setPetHistories([]);
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      setIsLoading(true);

      const pets = await getUserPets(user.userId);

      const historyResults = await Promise.allSettled(
        pets.map(async (pet): Promise<PetHistory> => {
          const locations =
            await getPetLocationHistory(pet.DeviceId);

          /*
           * The API returns newest locations first.
           * Reverse them so each path runs from oldest
           * to newest.
           */
          const chronologicalLocations = [...locations]
            .filter(
              (location) =>
                Number.isFinite(location.Latitude) &&
                Number.isFinite(location.Longitude)
            )
            .reverse();

          return {
            pet,
            locations: chronologicalLocations,
          };
        })
      );

      const successfulHistories: PetHistory[] = [];
      let failedHistoryCount = 0;

      historyResults.forEach((result) => {
        if (result.status === "fulfilled") {
          successfulHistories.push(result.value);
        } else {
          failedHistoryCount += 1;

          console.error(
            "Unable to load a pet's history:",
            result.reason
          );
        }
      });

      setPetHistories(successfulHistories);

      const requestedPetExists =
        routeDeviceId !== null &&
        successfulHistories.some(
          (history) =>
            history.pet.DeviceId === routeDeviceId
        );

      if (requestedPetExists) {
        setSelectedPetId(routeDeviceId);
      } else {
        setSelectedPetId(null);
      }

      if (
        failedHistoryCount > 0 &&
        successfulHistories.length === 0
      ) {
        setError(
          "Unable to load location history."
        );
      } else if (failedHistoryCount > 0) {
        setError(
          "Some pet histories could not be loaded."
        );
      }
    } catch (err) {
      console.error(
        "Unable to load location history:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load location history."
      );

      setPetHistories([]);
    } finally {
      setIsLoading(false);
    }
  }, [routeDeviceId, user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  /*
   * When no individual pet is selected, fit the map
   * around every recorded point.
   */
  useEffect(() => {
    if (
      isLoading ||
      selectedPetId !== null ||
      historiesWithLocations.length === 0
    ) {
      return;
    }

    const allCoordinates =
      historiesWithLocations.flatMap((history) =>
        convertToCoordinates(history.locations)
      );

    const timeout = setTimeout(() => {
      fitMapToCoordinates(
        mapRef.current,
        allCoordinates
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    historiesWithLocations,
    isLoading,
    selectedPetId,
  ]);

  /*
   * When a pet is selected, fit the camera around only
   * that pet's route.
   */
  useEffect(() => {
    if (
      isLoading ||
      !selectedHistory ||
      selectedHistory.locations.length === 0
    ) {
      return;
    }

    const coordinates = convertToCoordinates(
      selectedHistory.locations
    );

    const timeout = setTimeout(() => {
      fitMapToCoordinates(
        mapRef.current,
        coordinates
      );
    }, 200);

    return () => clearTimeout(timeout);
  }, [isLoading, selectedHistory]);

  function handlePetSelection(deviceId: number) {
    setSelectedPetId((currentPetId) =>
      currentPetId === deviceId
        ? null
        : deviceId
    );
  }

  const visibleHistories =
    selectedPetId === null
      ? historiesWithLocations
      : historiesWithLocations.filter(
          (history) =>
            history.pet.DeviceId === selectedPetId
        );

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
      >
        {visibleHistories.map((history) => {
          const markerColor =
            history.pet.MarkerColor ??
            DEFAULT_MARKER_COLOR;

          const coordinates = convertToCoordinates(
            history.locations
          );

          const oldestLocation =
            history.locations[0];

          const newestLocation =
            history.locations[
              history.locations.length - 1
            ];

          return (
            <Fragment key={history.pet.DeviceId}>
              {coordinates.length >= 2 ? (
                <Polyline
                  coordinates={coordinates}
                  strokeColor={markerColor}
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}

              {oldestLocation ? (
                <Marker
                  coordinate={{
                    latitude:
                      oldestLocation.Latitude,
                    longitude:
                      oldestLocation.Longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title={
                    history.pet.DeviceName ??
                    "Unnamed Pet"
                  }
                  description="Route start"
                >
                  <View
                    style={[
                      styles.startMarker,
                      {
                        borderColor: markerColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.startMarkerCenter,
                        {
                          backgroundColor:
                            markerColor,
                        },
                      ]}
                    />
                  </View>
                </Marker>
              ) : null}

              {newestLocation ? (
                <Marker
                  coordinate={{
                    latitude:
                      newestLocation.Latitude,
                    longitude:
                      newestLocation.Longitude,
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                  title={
                    history.pet.DeviceName ??
                    "Unnamed Pet"
                  }
                  description={formatLocationTime(
                    newestLocation.RecordedAt
                  )}
                >
                  <View
                    style={styles.latestMarkerContainer}
                  >
                    <View
                      style={[
                        styles.latestMarkerIcon,
                        {
                          borderColor: markerColor,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.latestMarkerEmoji
                        }
                      >
                        🐾
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.latestMarkerPoint,
                        {
                          borderColor: markerColor,
                        },
                      ]}
                    />
                  </View>
                </Marker>
              ) : null}
            </Fragment>
          );
        })}
      </MapView>

      <View style={styles.headerOverlay}>
        <Text style={styles.title}>
          Location History
        </Text>

        <Text style={styles.subtitle}>
          {selectedHistory
            ? `${selectedHistory.pet.DeviceName ?? "Unnamed Pet"} route`
            : "All recorded pet routes"}
        </Text>

        {petHistories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.petSelectorContent
            }
          >
            <Pressable
              style={[
                styles.allPetsButton,
                selectedPetId === null &&
                  styles.selectedAllPetsButton,
              ]}
              onPress={() =>
                setSelectedPetId(null)
              }
            >
              <Text
                style={[
                  styles.allPetsButtonText,
                  selectedPetId === null &&
                    styles.selectedAllPetsButtonText,
                ]}
              >
                All Pets
              </Text>
            </Pressable>

            {petHistories.map((history) => {
              const markerColor =
                history.pet.MarkerColor ??
                DEFAULT_MARKER_COLOR;

              const isSelected =
                selectedPetId ===
                history.pet.DeviceId;

              return (
                <Pressable
                  key={history.pet.DeviceId}
                  style={[
                    styles.petButton,
                    isSelected &&
                      styles.selectedPetButton,
                  ]}
                  onPress={() =>
                    handlePetSelection(
                      history.pet.DeviceId
                    )
                  }
                >
                  <View
                    style={[
                      styles.petColorDot,
                      {
                        backgroundColor:
                          markerColor,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.petButtonText,
                      isSelected &&
                        styles.selectedPetButtonText,
                    ]}
                  >
                    {history.pet.DeviceName ??
                      "Unnamed Pet"}
                  </Text>

                  <Text
                    style={
                      styles.locationCount
                    }
                  >
                    {history.locations.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.timeRangeSection}>
          <Text style={styles.timeRangeLabel}>
            Show locations from
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.timeRangeContent
            }
          >
            {TIME_RANGE_OPTIONS.map((option) => {
              const isSelected =
                selectedTimeRange.label ===
                option.label;

              return (
                <Pressable
                  key={option.label}
                  style={[
                    styles.timeRangeButton,
                    isSelected &&
                      styles.selectedTimeRangeButton,
                  ]}
                  onPress={() =>
                    setSelectedTimeRange(option)
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                  }}
                  accessibilityLabel={
                    option.milliseconds === null
                      ? "Show all location history"
                      : `Show location history from the last ${option.label}`
                  }
                >
                  <Text
                    style={[
                      styles.timeRangeButtonText,
                      isSelected &&
                        styles.selectedTimeRangeButtonText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.messageCard}>
          <ActivityIndicator size="large" />

          <Text style={styles.messageTitle}>
            Loading history
          </Text>

          <Text style={styles.messageText}>
            Retrieving recorded pet locations...
          </Text>
        </View>
      ) : null}

      {!isLoading &&
      historiesWithLocations.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyIcon}>🗺️</Text>

          <Text style={styles.messageTitle}>
            No locations in this period
          </Text>

          <Text style={styles.messageText}>
            No GPS updates were recorded during the
            selected {selectedTimeRange.label.toLowerCase()} period.
            Try choosing a longer time range.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadHistory}
          >
            <Text style={styles.retryButtonText}>
              Refresh
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable onPress={loadHistory}>
            <Text style={styles.errorRetry}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && selectedHistory ? (
        <View style={styles.historySummary}>
          <View style={styles.summaryHeader}>
            <View
              style={[
                styles.summaryColor,
                {
                  backgroundColor:
                    selectedHistory.pet
                      .MarkerColor ??
                    DEFAULT_MARKER_COLOR,
                },
              ]}
            />

            <Text style={styles.summaryPetName}>
              {selectedHistory.pet.DeviceName ??
                "Unnamed Pet"}
            </Text>
          </View>

          <View style={styles.summaryDetails}>
            <View>
              <Text style={styles.summaryLabel}>
                Recorded points
              </Text>

              <Text style={styles.summaryValue}>
                {
                  selectedHistory.locations
                    .length
                }
              </Text>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>
                Latest recorded
              </Text>

              <Text style={styles.summaryValue}>
                {selectedHistory.locations
                  .length > 0
                  ? formatLocationTime(
                      selectedHistory.locations[
                        selectedHistory
                          .locations.length - 1
                      ].RecordedAt
                    )
                  : "No locations"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function convertToCoordinates(
  locations: LocationUpdate[]
): MapCoordinate[] {
  return locations.map((location) => ({
    latitude: Number(location.Latitude),
    longitude: Number(location.Longitude),
  }));
}

function fitMapToCoordinates(
  map: MapView | null,
  coordinates: MapCoordinate[]
) {
  if (!map || coordinates.length === 0) {
    return;
  }

  if (coordinates.length === 1) {
    map.animateToRegion(
      {
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      450
    );

    return;
  }

  map.fitToCoordinates(coordinates, {
    edgePadding: {
      top: 255,
      right: 60,
      bottom: 180,
      left: 60,
    },
    animated: true,
  });
}

function parseUtcDate(dateValue: string): Date {
  const hasTimezone =
    dateValue.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(dateValue);

  return new Date(
    hasTimezone ? dateValue : `${dateValue}Z`
  );
}

function formatLocationTime(
  dateValue: string
): string {
  const date = parseUtcDate(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  map: {
    flex: 1,
  },

  headerOverlay: {
    position: "absolute",
    top: 18,
    left: 14,
    right: 14,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    paddingTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 2,
    marginBottom: 12,
  },

  petSelectorContent: {
    paddingRight: 4,
    gap: 8,
  },

  allPetsButton: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#dbe3ec",
  },

  selectedAllPetsButton: {
    backgroundColor: "#1f2937",
    borderColor: "#1f2937",
  },

  allPetsButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  selectedAllPetsButtonText: {
    color: "white",
  },

  petButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe3ec",
  },

  selectedPetButton: {
    backgroundColor: "#eef2ff",
    borderColor: "#94a3b8",
  },

  petColorDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 7,
  },

  petButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  selectedPetButtonText: {
    color: "#111827",
  },

  locationCount: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },


  timeRangeSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 12,
    paddingTop: 11,
  },

  timeRangeLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },

  timeRangeContent: {
    paddingRight: 4,
    gap: 8,
  },

  timeRangeButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#dbe3ec",
  },

  selectedTimeRangeButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  timeRangeButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },

  selectedTimeRangeButtonText: {
    color: "white",
  },

  startMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "white",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  startMarkerCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  latestMarkerContainer: {
    alignItems: "center",
  },

  latestMarkerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  latestMarkerEmoji: {
    fontSize: 23,
  },

  latestMarkerPoint: {
    width: 13,
    height: 13,
    backgroundColor: "white",
    borderRightWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: "45deg" }],
    marginTop: -8,
    elevation: 4,
  },

  messageCard: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "43%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  messageTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },

  messageText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    textAlign: "center",
  },

  retryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 17,
  },

  retryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  errorBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  errorText: {
    color: "#991b1b",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 12,
  },

  errorRetry: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "800",
  },

  historySummary: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 17,
    elevation: 9,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  summaryColor: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginRight: 9,
  },

  summaryPetName: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
  },

  summaryDetails: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryRight: {
    alignItems: "flex-end",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 3,
  },

  summaryValue: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "700",
  },
});