module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '@react-native-async-storage/async-storage': '<rootDir>/__tests__/__mocks__/async-storage.ts',
      },
      globals: {
        __DEV__: false,
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!src/components/icons/**',
    '!src/components/*.tsx',
    '!src/screens/**',
    '!src/navigation/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
