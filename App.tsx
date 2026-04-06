import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { AppErrorBoundary } from './src/presentation/components/common/AppErrorBoundary';
import { installGlobalErrorHandlers } from './src/monitoring/errorCenter';
import { trackEvent } from './src/monitoring/telemetry';
import { analyticsService } from './src/data/api/analyticsService';
import appEnv from './src/config/env';
import { setObservabilityContext } from './src/monitoring/observabilityContext';
import { store } from './src/store';

const App: React.FC = () => {
  useEffect(() => {
    setObservabilityContext({
      environment: appEnv.environment,
      release: appEnv.release,
      appVersion: appEnv.appVersion,
      buildType: __DEV__ ? 'debug' : 'release',
    });
    installGlobalErrorHandlers();
    trackEvent('app_open');

    return () => {
      trackEvent('app_close');
      analyticsService.destroy();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppErrorBoundary>
              <AppNavigator />
            </AppErrorBoundary>
          </ThemeProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
