// Jest test setup file

// Increase timeout for network-dependent tests
jest.setTimeout(30000);

// Mock p-limit module
jest.mock('p-limit', () => ({
  __esModule: true,
  default: jest.fn(() => (fn: any) => fn())
}));

// Mock http and https
jest.mock('http');
jest.mock('https');

// Mock yaml
jest.mock('yaml');

// Mock fs
jest.mock('fs');

// Mock chalk
jest.mock('chalk');

// Mock ora
jest.mock('ora');

// Mock inquirer
jest.mock('inquirer');

// Mock table
jest.mock('table');

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for debugging
  warn: console.warn,
  error: console.error,
};

// Mock process.exit to prevent tests from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
  throw new Error(`process.exit called with code ${code}`);
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore mocks
  mockExit.mockRestore();
});