jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
  };
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMap = ({ children, ...props }: any) =>
    React.createElement(View, props, children);

  return {
    __esModule: true,
    default: MockMap,
    MAP_TYPES: { STANDARD: 'standard' },
    PROVIDER_GOOGLE: 'google',
    Marker: MockMap,
    Polyline: MockMap,
  };
});

jest.mock('@react-native-community/geolocation', () => ({
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn((success?: (position: any) => void) => {
    success?.({
      coords: {
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 5,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));
