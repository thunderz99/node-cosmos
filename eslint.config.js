const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
    {
        ignores: [".history/**", "dist/**", "coverage/**", "src/cosmos/condition/*.js"],
    },
    ...tsPlugin.configs["flat/recommended"],
    prettierRecommended,
    {
        languageOptions: {
            globals: { ...globals.node, ...globals.jest },
        },
        rules: {
            "prettier/prettier": "warn",
            // Preserve the existing policy while migrating the lint toolchain.
            "@typescript-eslint/no-explicit-any": "warn",
            "no-use-before-define": "off",
            "@typescript-eslint/no-use-before-define": ["off", { functions: true, classes: true }],
            "no-unused-vars": "off",
            "no-empty-function": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { vars: "all", args: "after-used", ignoreRestSiblings: false },
            ],
        },
    },
    {
        files: ["**/*.js"],
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-require-imports": "off",
        },
    },
];
