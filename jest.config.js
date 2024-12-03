module.exports = {
  preset: "ts-jest", // Use the ts-jest preset
  testEnvironment: "node", // Set the test environment (e.g., 'node', 'jsdom')
  transform: {
    "^.+\\.tsx?$": "ts-jest", // Transform TypeScript files using ts-jest
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$", // Regex for test files
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"], // File extensions to consider
};
