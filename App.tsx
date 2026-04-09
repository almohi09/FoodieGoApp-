import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/common/AppErrorBoundary';
import { installGlobalErrorHandlers } from './src/monitoring/errorCenter';
import { trackEvent } from './src/monitoring/telemetry';
import { analyticsService } from './src/api/analyticsService';
import { sentryService } from './src/services/sentryService';
import appEnv from './src/config/env';
import { setObservabilityContext } from './src/monitoring/observabilityContext';
import { notificationService, InAppNotification } from './src/services/notificationService';
import { ToastHost } from './src/components/Toast';
import { OfflineBanner } from './src/components/OfflineBanner';
import { Colors, Spacing, Typography } from './src/theme';

(TouchableOpacity as unknown as { defaultProps?: { activeOpacity?: number } }).defaultProps = {
  ...(TouchableOpacity as unknown as { defaultProps?: { activeOpacity?: number } }).defaultProps,
  activeOpacity: 0.7,
};

const App: React.FC = () => {
  const [banner, setBanner] = useState<InAppNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setObservabilityContext({
      environment: appEnv.environment,
      release: appEnv.release,
      appVersion: appEnv.appVersion,
      buildType: __DEV__ ? 'debug' : 'release',
    });

    sentryService.initialize({ releaseVersion: appEnv.release });

    installGlobalErrorHandlers();
    trackEvent('app_open');

    return () => {
      trackEvent('app_close');
      analyticsService.destroy();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = notificationService.addListener(message => {
      setBanner(message);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setBanner(null);
      }, 4500);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppErrorBoundary>
            <AppNavigator />
            <OfflineBanner />
            <ToastHost />
            {banner ? (
              <View style={styles.bannerWrap} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.banner}
                  onPress={() => setBanner(null)}
                >
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerBody}>{banner.body}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </AppErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bannerWrap: {
    position: 'absolute',
    top: Spacing.xl + Spacing.lg,
    left: Spacing.screenEdge,
    right: Spacing.screenEdge,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: Colors.TEXT_PRIMARY,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.cardGap,
    minHeight: Spacing.touchTarget,
  },
  bannerTitle: {
    ...Typography.body2,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  bannerBody: {
    ...Typography.caption,
    color: Colors.TEXT_INVERSE,
    fontWeight: '600',
  },
});

export default App;




