/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@pim/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@pim/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: { module: 'esnext', target: 'es2022' } }],
  },
  testMatch: ['**/*.test.ts'],
};
