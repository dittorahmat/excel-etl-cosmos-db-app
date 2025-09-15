module.exports = {
  mutator: {
    name: 'typescript',
    excludedMutations: [
      'StringLiteral',
      'BlockStatement',
      'ArrowFunctionExpression',
      'FunctionExpression'
    ]
  },
  testRunner: 'vitest',
  testRunnerOptions: {
    projectType: 'custom',
    configFile: '../vitest.config.ts',
    enableFindRelatedTests: false,
  },
  mutatorOptions: {
    name: 'typescript',
    options: {
      projectType: 'custom',
      configFile: '../tsconfig.json',
      enableFindRelatedTests: false,
    }
  },
  transpilers: [],
  mutate: [
    '../src/**/*.ts',
    '../src/**/*.tsx',
    '!../src/**/__tests__/**/*.ts',
    '!../src/**/__tests__/**/*.tsx',
    '!../src/**/*.test.ts',
    '!../src/**/*.test.tsx',
    '!../src/**/*.spec.ts',
    '!../src/**/*.spec.tsx',
    '!../server/src/**/*.test.ts'
  ],
  files: [
    '../src/**/*',
    '../test/**/*',
    '../server/src/**/*'
  ],
  coverageAnalysis: 'perTest',
  htmlReporter: {
    baseDir: 'reports/mutation/html'
  },
  jsonReporter: {
    file: 'reports/mutation/mutation.json'
  },
  clearTextReporter: {
    allowColor: true,
    allowEmojis: true,
    logTests: true
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  dryRunTimeoutMinutes: 5,
  maxConcurrentTestRunners: 4,
  symlinkNodeModules: false,
  ignoreStatic: true,
  ignorePatterns: [
    'node_modules',
    '*.test.ts',
    '*.spec.ts',
    '__tests__',
    '__mocks__'
  ]
};