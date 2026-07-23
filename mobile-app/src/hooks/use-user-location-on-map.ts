import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";

export type UserMapCoordinate = {
  latitude: number;
  longitude: number;
};

export function useUserLocationOnMap(): UserMapCoordinate | null {
  const [coordinate, setCoordinate] =
    useState<UserMapCoordinate | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function enableUserLocation() {
        try {
          let permission =
            await Location.getForegroundPermissionsAsync();

          if (!permission.granted && permission.canAskAgain) {
            permission =
              await Location.requestForegroundPermissionsAsync();
          }

          if (!permission.granted) {
            if (isActive) {
              setCoordinate(null);
            }
            return;
          }

          const lastKnown =
            await Location.getLastKnownPositionAsync({
              maxAge: 60_000,
            });

          if (isActive && lastKnown) {
            setCoordinate({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
          }

          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 2,
              timeInterval: 5_000,
            },
            (position) => {
              if (isActive) {
                setCoordinate({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              }
            }
          );

          if (!isActive) {
            subscription.remove();
          } else {
            locationSubscription = subscription;
          }
        } catch (error) {
          console.error(
            "Unable to enable the phone location marker:",
            error
          );

          if (isActive) {
            setCoordinate(null);
          }
        }
      }

      let locationSubscription: Location.LocationSubscription | null = null;

      enableUserLocation();

      return () => {
        isActive = false;
        locationSubscription?.remove();
      };
    }, [])
  );

  return coordinate;
}
