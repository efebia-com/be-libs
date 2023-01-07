const config = {
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  verbose: true,
  testMatch: ["<rootDir>/__tests__/*.test.ts"],
  bail: true,
  preset: "ts-jest",
};
module.exports = config;
