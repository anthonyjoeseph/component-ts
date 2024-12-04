module.exports = {
  preset: "ts-jest", // Use the ts-jest preset
  testEnvironment: "node", // Set the test environment (e.g., 'node', 'jsdom')
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$", // Regex for test files
  transformIgnorePatterns: ["/node_modules/(?!hastscript)/"],
};
