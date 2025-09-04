/**
 * Minimal Jest configuration for testing
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: false
};