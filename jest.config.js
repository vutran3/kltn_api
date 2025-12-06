module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests'],
    verbose: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/services/*.js',
        '!src/utils/*.js',
        'src/controllers/*.js',
        '!**/node_modules/**'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: { lines: 80, functions: 80, branches: 70, statements: 80 }
    },
    moduleFileExtensions: ['js', 'json'],
};