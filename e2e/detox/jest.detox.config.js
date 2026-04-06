module.exports = {
  testMatch: ['<rootDir>/e2e/detox/**/*.detox.e2e.js'],
  setupFilesAfterEnv: ['<rootDir>/e2e/detox/init.js'],
  testRunner: 'jest-circus/runner',
  testTimeout: 120000,
};
