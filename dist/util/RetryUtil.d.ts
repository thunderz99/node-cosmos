/**
 * execute a function with retry
 * @param f function to execute
 */
export declare function executeWithRetry<T>(f: () => Promise<T>): Promise<T>;
