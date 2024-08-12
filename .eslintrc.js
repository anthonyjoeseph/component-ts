module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
  ignorePatterns: ["workspaces/cli/index.js", "workspaces/slackbot/dist/**/*.js", "**/*.md"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "unused-imports", "simple-import-sort"],
  rules: {
    "prettier/prettier": ["error", { endOfLine: "auto", printWidth: 120 }],
    "no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "simple-import-sort/imports": "error",
  },
};
