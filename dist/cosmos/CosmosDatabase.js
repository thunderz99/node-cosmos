"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._partition = exports.CosmosError = void 0;
class CosmosError {
    constructor(errorResponse) {
        this.name = "CosmosError";
        Object.assign(this, errorResponse);
        this.message = errorResponse.message || "";
        this.code = errorResponse.code || errorResponse.statusCode;
    }
}
exports.CosmosError = CosmosError;
exports._partition = "_partition"; // Partition KeyName
//# sourceMappingURL=CosmosDatabase.js.map