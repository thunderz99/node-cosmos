import { sleep } from "./wait";

/**
 * execute a function with retry
 * @param f function to execute
 */
export async function executeWithRetry<T>(f: () => Promise<T>): Promise<T> {
    const maxRetries = 10;
    let i = 0;
    while (true) {
        try {
            i++;
            return await f();
        } catch (e) {
            if (isRetryableError(e)) {
                if (i > maxRetries) {
                    throw e;
                }
                console.log(`[INFO] 429 Too Many Requests. Wait:${e.retryAfterInMilliseconds}`);
                const wait = e.retryAfterInMilliseconds || 1000;
                await sleep(wait);
            } else {
                throw e;
            }
        }
    }
}

function isRetryableError(
    e: unknown,
): e is { code: number; retryAfterInMilliseconds?: number; message?: string } {
    return typeof e === "object" && e !== null && "code" in e && e.code === 429;
}
