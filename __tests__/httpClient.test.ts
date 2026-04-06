import { newIdempotencyKey } from '../src/data/api/httpClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('httpClient', () => {
  test('generates unique idempotency keys per call', () => {
    const a = newIdempotencyKey('order');
    const b = newIdempotencyKey('order');

    expect(a).not.toEqual(b);
    expect(a.startsWith('order-')).toBe(true);
    expect(b.startsWith('order-')).toBe(true);
  });
});
