"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosImpl = exports.CosmosDatabaseImpl = exports.isJsonObject = exports.CosmosBuilder = void 0;
var CosmosBuilder_1 = require("./cosmos/CosmosBuilder");
Object.defineProperty(exports, "CosmosBuilder", { enumerable: true, get: function () { return CosmosBuilder_1.CosmosBuilder; } });
var Condition_1 = require("./cosmos/condition/Condition");
Object.defineProperty(exports, "isJsonObject", { enumerable: true, get: function () { return Condition_1.isJsonObject; } });
var CosmosDatabaseImpl_1 = require("./cosmos/impl/cosmosdb/CosmosDatabaseImpl");
Object.defineProperty(exports, "CosmosDatabaseImpl", { enumerable: true, get: function () { return CosmosDatabaseImpl_1.CosmosDatabaseImpl; } });
var CosmosImpl_1 = require("./cosmos/impl/cosmosdb/CosmosImpl");
Object.defineProperty(exports, "CosmosImpl", { enumerable: true, get: function () { return CosmosImpl_1.CosmosImpl; } });
//# sourceMappingURL=index.js.map