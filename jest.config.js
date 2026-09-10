/** @type {import('jest').Config} */
const config = {
  // Use ts-jest directly — avoids Next.js SWC binary requirement
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
        },
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.spec.ts',
  ],
  // Exclude Next.js pages and components from tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
  ],
  // Coverage setup
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
    },
  },
};

module.exports = config;
