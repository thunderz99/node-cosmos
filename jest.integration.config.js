module.exports = {
    ...require("./jest.config"),
    testPathIgnorePatterns: ["/node_modules/", "/tests/unit/", "/tests/cosmos/condition/"],
};
