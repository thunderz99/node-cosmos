/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    if (value === null || value === undefined) return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const testDummy: TValue = value;
    return true;
}

/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
function notEmptyString(value: string | null | undefined): value is string {
    if (value === null || value === undefined || value === "") return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const testDummy: string = value;
    return true;
}

/**
 * Judge a type is whether an array with type guard
 * @param maybeArray
 * @returns
 */
const isArray = <T>(maybeArray: T | readonly T[]): maybeArray is T[] => {
    return Array.isArray(maybeArray);
};

export { notEmpty, notEmptyString, isArray };
