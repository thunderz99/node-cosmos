"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const sleep = (wait) => new Promise((resolve) => {
    setTimeout(resolve, wait);
});
exports.sleep = sleep;
//# sourceMappingURL=wait.js.map