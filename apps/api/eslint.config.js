const eslintConfig = require("@nexora/eslint-config");

module.exports = [
  ...eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },
];
