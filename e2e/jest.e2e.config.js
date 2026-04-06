const base = require('../jest.config');

module.exports = {
  ...base,
  rootDir: '..',
  displayName: 'e2e-smoke',
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['<rootDir>/e2e/**/*.e2e.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/e2e/jest.setup.ts'],
};
