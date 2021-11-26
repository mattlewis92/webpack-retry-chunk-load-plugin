/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  coveragePathIgnorePatterns: ['test/integration/utils/'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
};
