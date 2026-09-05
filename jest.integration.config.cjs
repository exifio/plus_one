module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
};
