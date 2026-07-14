export interface LocationUpdate {
  locationUpdateId: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  recordedAt: string;
  receivedAt: string;
}