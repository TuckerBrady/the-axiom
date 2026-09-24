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
        '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.ts',
        '^expo-haptics$': '<rootDir>/__tests__/__mocks__/expo-haptics.ts',
      },
      globals: {
        __DEV__: false,
      },
    },
    {
      // AXM-020: rendered component tests. Same mocks as the unit tier, but
      // tsconfig.jest.json emits JSX (react-jsx) so a component under src/
      // can render through react-test-renderer. Kept to its own project so
      // the unit tier's coverage collection is unchanged. It instruments only
      // the components a render test actually drives: without the ignore
      // pattern every other .tsx component would join the coverage totals at
      // 0% (the unit tier can't parse their JSX, so today they are skipped).
      // Each render test adds its component here (PROMPT_162: HUDChrome).
      displayName: 'render',
      testMatch: ['<rootDir>/__tests__/render/**/*.test.{ts,tsx}'],
      coveragePathIgnorePatterns: ['/node_modules/', '^(?!.*[\\\\/](?:PieceTray|HUDChrome)\\.tsx$).*\\.tsx$'],
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
