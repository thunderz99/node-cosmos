"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsDefined = assertIsDefined;
exports.assertNotEmpty = assertNotEmpty;
function assertIsDefined(val, name = "val") {
    if (val === undefined || val === null) {
        throw new Error(`Expected '${name}' to be defined, but received ${val}`);
    }
}
function assertNotEmpty(val, name = "val") {
    if (!val) {
        throw new Error(`Expected '${name}' to be nonempty, but received ${val}`);
    }
}
//# sourceMappingURL=assert.js.map