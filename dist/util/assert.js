"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNotEmpty = exports.assertIsDefined = void 0;
function assertIsDefined(val, name = "val") {
    if (val === undefined || val === null) {
        throw new Error(`Expected '${name}' to be defined, but received ${val}`);
    }
}
exports.assertIsDefined = assertIsDefined;
function assertNotEmpty(val, name = "val") {
    if (!val) {
        throw new Error(`Expected '${name}' to be nonempty, but received ${val}`);
    }
}
exports.assertNotEmpty = assertNotEmpty;
//# sourceMappingURL=assert.js.map