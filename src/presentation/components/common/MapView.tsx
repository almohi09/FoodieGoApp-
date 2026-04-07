import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapViewComponent, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { useTheme } from '../../../context/ThemeContext';

interface MapViewProps {
  style?: any;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  riderLocation?: { lat: number; lng: number };
  showRoute?: boolean;
  height?: number;
  estimatedMinutes?: number;
  distanceKm?: number;
  isLive?: boolean;
}

const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const MapView: React.FC<MapViewProps> = ({
  style,
  origin,
  destination,
  riderLocation,
  showRoute = true,
  height = 200,
  estimatedMinutes,
  distanceKm,
  isLive = false,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const mapRef = useRef<MapViewComponent>(null);
  const [livePulse, setLivePulse] = useState(true);

  const initialRegion: Region = {
    latitude: riderLocation?.lat || origin?.lat || 28.62,
    longitude: riderLocation?.lng || origin?.lng || 77.36,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  useEffect(() => {
    if (riderLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: riderLocation.lat,
          longitude: riderLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [riderLocation]);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setLivePulse(p => !p);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const routeCoordinates: { latitude: number; longitude: number }[] = [];
  if (origin && showRoute) {
    routeCoordinates.push({ latitude: origin.lat, longitude: origin.lng });
  }
  if (riderLocation && showRoute) {
    routeCoordinates.push({
      latitude: riderLocation.lat,
      longitude: riderLocation.lng,
    });
  }
  if (destination && showRoute) {
    routeCoordinates.push({
      latitude: destination.lat,
      longitude: destination.lng,
    });
  }

  const calculatedDistance =
    distanceKm ||
    (riderLocation && destination
      ? calculateDistance(
          riderLocation.lat,
          riderLocation.lng,
          destination.lat,
          destination.lng,
        )
      : null);

  const handleCenterOnRider = () => {
    if (riderLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: riderLocation.lat,
          longitude: riderLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <MapViewComponent
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        zoomControlEnabled={false}
        mapType="standard"
        customMapStyle={mapDarkStyle}
      >
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Restaurant"
            description="Pickup location"
          >
            <View style={styles.originMarker}>
              <Text style={styles.markerEmoji}>🏪</Text>
            </View>
          </Marker>
        )}

        {riderLocation && (
          <Marker
            coordinate={{
              latitude: riderLocation.lat,
              longitude: riderLocation.lng,
            }}
            title="Rider"
            description="Your delivery partner"
            rotation={45}
          >
            <View style={styles.riderMarker}>
              <Text style={styles.riderMarkerEmoji}>🛵</Text>
            </View>
          </Marker>
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            title="Delivery"
            description="Your location"
          >
            <View style={styles.destinationMarker}>
              <Text style={styles.markerEmoji}>🏠</Text>
            </View>
          </Marker>
        )}

        {showRoute && routeCoordinates.length >= 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapViewComponent>

      {isLive && (
        <View
          style={[styles.liveIndicator, { backgroundColor: colors.success }]}
        >
          <View style={[styles.liveDot, livePulse && { opacity: 1 }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {(estimatedMinutes || calculatedDistance) && (
        <View style={[styles.etaCard, { backgroundColor: colors.surface }]}>
          {estimatedMinutes && (
            <View style={styles.etaItem}>
              <Text style={[styles.etaValue, { color: colors.textPrimary }]}>
                {estimatedMinutes}
              </Text>
              <Text style={[styles.etaLabel, { color: colors.textTertiary }]}>
                mins
              </Text>
            </View>
          )}
          {calculatedDistance !== null && (
            <View style={styles.etaItem}>
              <Text style={[styles.etaValue, { color: colors.textPrimary }]}>
                {calculatedDistance.toFixed(1)}
              </Text>
              <Text style={[styles.etaLabel, { color: colors.textTertiary }]}>
                km
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.centerButton, { backgroundColor: colors.surface }]}
        onPress={handleCenterOnRider}
      >
        <Text style={[styles.centerIcon, { color: colors.primary }]}>◎</Text>
      </TouchableOpacity>

      <View style={styles.coordinatesOverlay}>
        {riderLocation && (
          <Text style={styles.coordinatesText}>
            {riderLocation.lat.toFixed(4)}, {riderLocation.lng.toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
};

const mapDarkStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
];

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  originMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  destinationMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  riderMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  markerEmoji: {
    fontSize: 20,
  },
  riderMarkerEmoji: {
    fontSize: 20,
    transform: [{ rotate: '45deg' }],
  },
  coordinatesOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  coordinatesText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
    opacity: 0.5,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  etaCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  etaItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  etaLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  centerButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  centerIcon: {
    fontSize: 24,
    fontWeight: '700',
  },
});

export default MapView;
