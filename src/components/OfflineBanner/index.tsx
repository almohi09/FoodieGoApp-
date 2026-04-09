import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Spacing } from '../../theme';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: offline ? 0 : -48,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [offline, translateY]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: Colors.ERROR,
    zIndex: 3000,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.TEXT_INVERSE,
  },
  text: {
    color: Colors.TEXT_INVERSE,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OfflineBanner;

