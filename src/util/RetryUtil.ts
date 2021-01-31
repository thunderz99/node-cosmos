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
            if (e.code === 429) {
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
