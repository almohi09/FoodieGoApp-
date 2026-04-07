module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/backend/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|@react-native-community|react-native-maps|react-redux|@reduxjs|redux|immer|reselect)/)',
  ],
};
