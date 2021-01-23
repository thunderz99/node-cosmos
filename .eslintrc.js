module.exports = {
    env: {
        browser: true,
        node: true,
        commonjs: true,
        es6: true,
    },
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2019,
        sourceType: "module",
    },
    extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
        "plugin:prettier/recommended",
    ],
    plugins: ["prettier"],
    rules: {
        "prettier/prettier": [
            "warn",
            {
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
                trailingComma: "all",
                printWidth: 100,
            },
        ],
        camelcase: "off",
        "@typescript-eslint/camelcase": ["off", { properties: "always" }],
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": ["off", { functions: true, classes: true }],
        "no-unused-vars": "off",
        "no-empty-function": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-empty-function": ["off"],
        "@typescript-eslint/prefer-namespace-keyword": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                vars: "all",
                args: "after-used",
                ignoreRestSiblings: false,
            },
        ],
    },
    overrides: [
        {
            files: ["*.js"],
            rules: {
                "@typescript-eslint/no-unused-vars": "off",
                "@typescript-eslint/no-var-requires": "off",
                "@typescript-eslint/explicit-function-return-type": "off",
            },
        },
    ],
};
