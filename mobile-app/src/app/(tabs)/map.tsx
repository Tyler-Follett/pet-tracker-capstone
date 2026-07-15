import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

const TEST_LOCATION = {
  latitude: 47.5615,
  longitude: -52.7126,
};

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: TEST_LOCATION.latitude,
          longitude: TEST_LOCATION.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={TEST_LOCATION}
          title="Test Pet"
          description="Test location"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});