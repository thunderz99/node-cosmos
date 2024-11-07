"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._partition = exports.CosmosError = void 0;
class CosmosError {
    constructor(errorResponse, code = (errorResponse === null || errorResponse === void 0 ? void 0 : errorResponse.code) || (errorResponse === null || errorResponse === void 0 ? void 0 : errorResponse.statusCode), message = (errorResponse === null || errorResponse === void 0 ? void 0 : errorResponse.message) || "") {
        this.name = "CosmosError";
        if (errorResponse) {
            Object.assign(this, errorResponse);
        }
        this.code = code;
        this.message = message;
    }
}
exports.CosmosError = CosmosError;
exports._partition = "_partition"; // Partition KeyName
//# sourceMappingURL=CosmosDatabase.js.map