/* eslint-env jest */
const detox = require('detox');
const config = require('../../.detoxrc');

beforeAll(async () => {
  await detox.init(config, { launchApp: false });
}, 300000);

afterAll(async () => {
  await detox.cleanup();
});
