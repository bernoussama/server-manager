/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Fix for the error with the generateBindZoneContent function
  moduleNameMapper: {
    '^../../controllers/dnsController$': '<rootDir>/src/controllers/dnsController.ts',
    '^../httpController$': '<rootDir>/src/controllers/httpController.ts'
  }
};
