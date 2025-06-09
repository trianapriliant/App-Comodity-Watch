import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Global test setup
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/komoditas_watch_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

// Cleanup after all tests
afterAll(async () => {
  // Global test cleanup
});

// Setup before each test
beforeEach(async () => {
  // Individual test setup
});

// Cleanup after each test
afterEach(async () => {
  // Individual test cleanup
});
