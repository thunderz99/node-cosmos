"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithRetry = executeWithRetry;
const wait_1 = require("./wait");
/**
 * execute a function with retry
 * @param f function to execute
 */
async function executeWithRetry(f) {
    const maxRetries = 10;
    let i = 0;
    while (true) {
        try {
            i++;
            return await f();
        }
        catch (e) {
            if (isRetryableError(e)) {
                if (i > maxRetries) {
                    throw e;
                }
                console.log(`[INFO] 429 Too Many Requests. Wait:${e.retryAfterInMilliseconds}`);
                const wait = e.retryAfterInMilliseconds || 1000;
                await (0, wait_1.sleep)(wait);
            }
            else {
                throw e;
            }
        }
    }
}
function isRetryableError(e) {
    return typeof e === "object" && e !== null && "code" in e && e.code === 429;
}
//# sourceMappingURL=RetryUtil.js.map