import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getUserPets, Pet } from "../../services/api";


export default function HomeScreen() {
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadPets = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setError("");

      const data = await getUserPets(user.userId);

      setPets(data);
      setCurrentTime(Date.now());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load pets."
      );
    }
  }, [user]);

  // Refresh immediately whenever the Home tab is opened.
  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [loadPets])
  );

  // Recalculate visible relative times every 10 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Fetch fresh tracker timestamps every 15 seconds.
  useEffect(() => {
    if (!user) {
      return;
    }

    const interval = setInterval(() => {
      loadPets();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, loadPets]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.appTitle}>Pet Tracker</Text>

      <Text style={styles.welcomeText}>
        {user?.firstName
          ? `Welcome back, ${user.firstName}!`
          : "Welcome back!"}
      </Text>

      <Text style={styles.sectionTitle}>My Pets</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {pets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No pets added yet</Text>

          <Text style={styles.emptyText}>
            Add a pet from your Profile tab to begin tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.petList}>
          {pets.map((pet) => {
            const online = isOnline(
              pet.LatestReceivedAt,
              currentTime
            );

            return (
              <View
                key={pet.DeviceId}
                style={styles.petCard}
              >
                <View style={styles.petThumbnail}>
                  {pet.PhotoUrl ? (
                    <Image
                      key={pet.PhotoUrl}
                      source={{ uri: pet.PhotoUrl }}
                      style={styles.petThumbnailImage}
                    />
                  ) : (
                    <Text style={styles.petThumbnailPlaceholder}>
                      🐾
                    </Text>
                  )}
                </View>

                <View style={styles.petInfo}>
                  <Text style={styles.petName}>
                    {pet.DeviceName ?? "Unnamed Pet"}
                  </Text>

                  <Text
                    style={[
                      styles.petStatus,
                      online
                        ? styles.onlineStatus
                        : styles.offlineStatus,
                    ]}
                  >
                    {online ? "● Online" : "● Offline"}
                  </Text>

                  <Text style={styles.lastUpdated}>
                    {formatLastUpdated(
                      pet.LatestReceivedAt,
                      currentTime
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/map")}
        >
          <Text style={styles.primaryButtonText}>
            View Live Map
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/history")}
        >
          <Text style={styles.secondaryButtonText}>
            View History
          </Text>
        </Pressable>
      </View>
    </ScrollView>
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


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "bold",
    marginTop: 48,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 18,
    color: "#555",
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  petList: {
    marginBottom: 12,
  },
  petCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  petThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 16,
  },
  petThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  petThumbnailPlaceholder: {
    fontSize: 28,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: "700",
  },
  petStatus: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
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
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontWeight: "600",
  },
});