/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
declare function notEmpty<TValue>(value: TValue | null | undefined): value is TValue;
/**
 * A helper function to judge whether a value is empty
 * @param value
 * @returns
 */
declare function notEmptyString(value: string | null | undefined): value is string;
/**
 * Judge a type is whether an array with type guard
 * @param maybeArray
 * @returns
 */
declare const isArray: <T>(maybeArray: T | readonly T[]) => maybeArray is T[];
export { notEmpty, notEmptyString, isArray };
//# sourceMappingURL=objects.d.ts.map