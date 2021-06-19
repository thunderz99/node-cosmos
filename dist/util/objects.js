"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArray = exports.notEmptyString = exports.notEmpty = void 0;
/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
function notEmpty(value) {
    if (value === null || value === undefined)
        return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const testDummy = value;
    return true;
}
exports.notEmpty = notEmpty;
/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
function notEmptyString(value) {
    if (value === null || value === undefined || value === "")
        return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const testDummy = value;
    return true;
}
exports.notEmptyString = notEmptyString;
/**
 * Judge a type is whether an array with type guard
 * @param maybeArray
 * @returns
 */
const isArray = (maybeArray) => {
    return Array.isArray(maybeArray);
};
exports.isArray = isArray;
//# sourceMappingURL=objects.js.map