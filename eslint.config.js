const tsParser = require("@typescript-eslint/parser");
const tsEslint = require("@typescript-eslint/eslint-plugin");
const jest = require("eslint-plugin-jest");
const prettierRecommended = require("eslint-plugin-prettier/recommended");
const simpleImportSort = require("eslint-plugin-simple-import-sort");
const globals = require("globals");

// eslint-plugin-import has no ESLint 10 release; its import/first,
// import/newline-after-import and import/no-duplicates rules are dropped and
// core no-duplicate-imports stands in for the last one.
module.exports = [
    { ignores: ["dist/", "lib/", "node_modules/", "coverage/"] },
    ...tsEslint.configs["flat/recommended"],
    prettierRecommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaVersion: 2022, sourceType: "module" },
            globals: { ...globals.node }
        },
        plugins: { "simple-import-sort": simpleImportSort },
        rules: {
            "no-duplicate-imports": "error",
            "simple-import-sort/imports": "error",
            "sort-imports": "off"
        }
    },
    {
        files: ["*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: { ...globals.node }
        },
        rules: { "@typescript-eslint/no-require-imports": "off" }
    },
    {
        files: ["__tests__/**/*.ts"],
        ...jest.configs["flat/recommended"],
        languageOptions: {
            ...jest.configs["flat/recommended"].languageOptions,
            globals: { ...globals.node, ...globals.jest }
        }
    }
];
