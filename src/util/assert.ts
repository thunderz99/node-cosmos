export function assertIsDefined<T>(val: T, name = "val"): asserts val is NonNullable<T> {
    if (val === undefined || val === null) {
        throw new Error(`Expected '${name}' to be defined, but received ${val}`);
    }
}

export function assertNotEmpty(val?: string, name = "val"): asserts val is NonNullable<string> {
    if (!val) {
        throw new Error(`Expected '${name}' to be nonempty, but received ${val}`);
    }
}
