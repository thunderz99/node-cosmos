"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoImpl = exports.MongoDatabaseImpl = exports.CosmosImpl = exports.CosmosDatabaseImpl = exports.isJsonObject = exports.CosmosError = exports.CosmosBuilder = void 0;
var CosmosBuilder_1 = require("./cosmos/CosmosBuilder");
Object.defineProperty(exports, "CosmosBuilder", { enumerable: true, get: function () { return CosmosBuilder_1.CosmosBuilder; } });
var CosmosDatabase_1 = require("./cosmos/CosmosDatabase");
Object.defineProperty(exports, "CosmosError", { enumerable: true, get: function () { return CosmosDatabase_1.CosmosError; } });
var Condition_1 = require("./cosmos/condition/Condition");
Object.defineProperty(exports, "isJsonObject", { enumerable: true, get: function () { return Condition_1.isJsonObject; } });
var CosmosDatabaseImpl_1 = require("./cosmos/impl/cosmosdb/CosmosDatabaseImpl");
Object.defineProperty(exports, "CosmosDatabaseImpl", { enumerable: true, get: function () { return CosmosDatabaseImpl_1.CosmosDatabaseImpl; } });
var CosmosImpl_1 = require("./cosmos/impl/cosmosdb/CosmosImpl");
Object.defineProperty(exports, "CosmosImpl", { enumerable: true, get: function () { return CosmosImpl_1.CosmosImpl; } });
var MongoDatabaseImpl_1 = require("./cosmos/impl/mongodb/MongoDatabaseImpl");
Object.defineProperty(exports, "MongoDatabaseImpl", { enumerable: true, get: function () { return MongoDatabaseImpl_1.MongoDatabaseImpl; } });
var MongoImpl_1 = require("./cosmos/impl/mongodb/MongoImpl");
Object.defineProperty(exports, "MongoImpl", { enumerable: true, get: function () { return MongoImpl_1.MongoImpl; } });
//# sourceMappingURL=index.js.map