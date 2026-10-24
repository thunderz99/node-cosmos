"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArray = void 0;
exports.notEmpty = notEmpty;
exports.notEmptyString = notEmptyString;
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