module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/supabase/setupIntegrationTests.js'],
  globalSetup: '<rootDir>/tests/integration/supabase/globalSetup.cjs',
  globalTeardown: '<rootDir>/tests/integration/supabase/globalTeardown.cjs',
};
