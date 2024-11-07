"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosBuilder = void 0;
const CosmosImpl_1 = require("./impl/cosmosdb/CosmosImpl");
const MongoImpl_1 = require("./impl/mongodb/MongoImpl");
const assert_1 = __importDefault(require("assert"));
/**
 * Builder class to build a cosmos instance (for azure cosmosdb or mongodb)
 */
class CosmosBuilder {
    constructor() {
        this.dbType = CosmosBuilder.COSMOSDB;
        /**
         * Whether to auto generate _expireAtEnabled json field is ttl field is present. Used for compatibility for CosmosDB
         *
         */
        this.expireAtEnabled = false;
        /**
         * Whether to auto generate _etag json field when created/updated. Used for compatibility for CosmosDB
         */
        this.etagEnabled = false;
    }
    /**
     * Specify the dbType( "cosmosdb" or "mongodb" )
     *
     * @param dbType
     * @return cosmosBuilder
     */
    withDatabaseType(dbType) {
        this.dbType = dbType || CosmosBuilder.COSMOSDB;
        return this;
    }
    /**
     * Specify the connectionString for cosmosdb or mongodb
     *
     * @param connectionString
     * @return cosmosBuilder
     */
    withConnectionString(connectionString) {
        this.connectionString = connectionString;
        return this;
    }
    /**
     * Specify whether to enable the expireAt feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withExpireAtEnabled(enabled) {
        this.expireAtEnabled = enabled;
        return this;
    }
    /**
     * Specify whether to enable the etag feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withEtagEnabled(enabled) {
        this.etagEnabled = enabled;
        return this;
    }
    /**
     * Build the instance representing a Cosmos instance.
     *
     * @return Cosmos instance
     */
    build() {
        (0, assert_1.default)(this.dbType, `dbType should not be empty: ${this.dbType}`);
        (0, assert_1.default)(this.connectionString, `connectionString should not be empty ${this.connectionString}`);
        if (this.dbType === CosmosBuilder.COSMOSDB) {
            return new CosmosImpl_1.CosmosImpl(this.connectionString);
        }
        if (this.dbType === CosmosBuilder.MONGODB) {
            return new MongoImpl_1.MongoImpl(this.connectionString || "", this.expireAtEnabled, this.etagEnabled);
        }
        throw new Error(`Not supported dbType: ${this.dbType}`);
    }
}
exports.CosmosBuilder = CosmosBuilder;
/**
 * Constant for dbType: cosmosdb
 */
CosmosBuilder.COSMOSDB = "cosmosdb";
/**
 * Constant for dbType: mongodb
 */
CosmosBuilder.MONGODB = "mongodb";
//# sourceMappingURL=CosmosBuilder.js.map