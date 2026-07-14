import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable, Image } from "react-native";
import { useCallback, useState, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { getUserPets, Pet } from "../../services/api";


import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load pets.");
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [loadPets])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>
          {user ? `${user.firstName} ${user.lastName}` : "User"}
        </Text>

        <Text style={styles.email}>{user?.email ?? ""}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Pets</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pets.length === 0 ? (
          <Text style={styles.placeholder}>No pets added yet.</Text>
        ) : (
        pets.map((pet) => (
          <Pressable
            key={pet.DeviceId}
            style={styles.petCard}
            onPress={() =>
              router.push({
                pathname: "/pet/[id]",
                params: {
                  id: pet.DeviceId.toString(),
                },
              })
            }
          >
<View style={styles.petCardContent}>
  <View style={styles.petThumbnail}>
    {pet.PhotoUrl ? (
      <Image
        source={{ uri: pet.PhotoUrl }}
        style={styles.petThumbnailImage}
      />
    ) : (
      <Text style={styles.petThumbnailPlaceholder}>🐾</Text>
    )}
  </View>

              <View style={styles.petInfo}>
                <Text style={styles.petName}>
                  {pet.DeviceName ?? "Unnamed Pet"}
                </Text>

                <Text
                  style={[
                    styles.petStatus,
                    isOnline(pet.LatestReceivedAt, currentTime)
                      ? styles.onlineStatus
                      : styles.offlineStatus,
                  ]}
                >
                  {isOnline(pet.LatestReceivedAt, currentTime)
                    ? "● Online"
                    : "● Offline"}
                </Text>

                <Text style={styles.lastUpdated}>
                  {formatLastUpdated(
                    pet.LatestReceivedAt,
                    currentTime
                  )}
                </Text>
              </View>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
)}

        <PrimaryButton
          title="Add Pet"
          onPress={() => router.push("/add-pet")}
        />
      </View>

      <View style={styles.signOutSection}>
        <PrimaryButton title="Sign Out" onPress={signOut} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f5f7fa",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginTop: 48,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: "#555",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  placeholder: {
    color: "#666",
    fontSize: 16,
    marginBottom: 12,
  },
  signOutSection: {
    marginTop: "auto",
  },
  petCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chevron: {
    color: "#777",
    fontSize: 28,
  },
  petName: {
    fontSize: 18,
    fontWeight: "700",
  },
  petStatus: {
    marginTop: 4,
    color: "#666",
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontWeight: "600",
  },
  petCardContent: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

petThumbnail: {
  width: 58,
  height: 58,
  borderRadius: 29,
  backgroundColor: "#e5e7eb",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  marginRight: 14,
},
petThumbnailImage: {
  width: "100%",
  height: "100%",
},
petThumbnailPlaceholder: {
  fontSize: 26,
},
petInfo: {
  flex: 1,
},
onlineStatus: {
  color: "#15803d",
},
offlineStatus: {
  color: "#b91c1c",
},
lastUpdated: {
  color: "#64748b",
  marginTop: 2,
  fontSize: 13,
},
});