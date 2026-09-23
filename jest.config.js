module.exports = {
  projects: [
    {
      displayName: 'unit',
      // tsconfig.jest.json only swaps jsx to react-jsx so a component under
      // src/ can render through react-test-renderer (AXM-020).
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '@react-native-async-storage/async-storage': '<rootDir>/__tests__/__mocks__/async-storage.ts',
        '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.ts',
        '^expo-haptics$': '<rootDir>/__tests__/__mocks__/expo-haptics.ts',
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
    {
      displayName: 'lint',
      testMatch: ['<rootDir>/__tests__/lint/**/*.test.{ts,tsx}'],
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
    // Imperative shells for the shots harness: `xcrun simctl` / Maestro
    // process wiring and the CLI entry point. They can only execute on a
    // macOS host with a simulator, so unit coverage of them would be
    // fiction. Every judgement they act on lives in src/shots/{args,
    // devices,manifest,plan,host}.ts, which are fully covered.
    '!src/shots/cli.ts',
    '!src/shots/simctl.ts',
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
