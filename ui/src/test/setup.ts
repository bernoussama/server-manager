// src/test/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Create MSW server for API mocking
export const server = setupServer();

// Setup before tests
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen();
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});