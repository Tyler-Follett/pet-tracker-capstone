import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

import { useUserLocationOnMap } from "../hooks/use-user-location-on-map";

export default function PhoneLocationMarker() {
  const coordinate = useUserLocationOnMap();

  if (!coordinate) {
    return null;
  }

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={1000}
      tracksViewChanges={false}
      title="Your location"
    >
      <View style={styles.accuracyRing}>
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  accuracyRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "white",
  },
});
