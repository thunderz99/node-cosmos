"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosBuilder = void 0;
const PostgresImpl_1 = require("./impl/postgresql/PostgresImpl");
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
        this.connectionString = CosmosBuilder.normalizeConnectionString(connectionString);
        return this;
    }
    /**
     * Normalizes the host part of a connection string so Node resolves localhost consistently.
     */
    static normalizeConnectionString(connectionString) {
        if (!connectionString) {
            return connectionString;
        }
        const normalized = CosmosBuilder.normalizePostgresVariants(connectionString);
        try {
            const url = new URL(normalized);
            CosmosBuilder.applySearchParamsToUserInfo(url);
            if (url.hostname === "localhost") {
                url.hostname = "127.0.0.1";
                url.host = url.port ? `127.0.0.1:${url.port}` : "127.0.0.1";
            }
            return url.toString();
        }
        catch {
            // ignore and fallback to raw connection string
            return normalized;
        }
    }
    /**
     * Transforms non-standard postgres connection strings (jdbc/postgresql schemes) into
     * the canonical postgres:// format so downstream URL parsing behaves consistently.
     */
    static normalizePostgresVariants(connectionString) {
        let normalized = connectionString;
        if (normalized.startsWith("jdbc:postgresql://")) {
            normalized = normalized.substring("jdbc:".length);
        }
        if (normalized.startsWith("postgresql://")) {
            normalized = `postgres://${normalized.substring("postgresql://".length)}`;
        }
        return normalized;
    }
    /**
     * Moves credentials encoded as search parameters (user/password) into the URL's
     * username/password fields, mirroring how postgres connection strings are typically formatted.
     */
    static applySearchParamsToUserInfo(url) {
        const params = url.searchParams;
        const user = params.get("user");
        const password = params.get("password");
        if (user && !url.username) {
            url.username = user;
        }
        if (password && !url.password) {
            url.password = password;
        }
        if (user) {
            params.delete("user");
        }
        if (password) {
            params.delete("password");
        }
        const serialized = params.toString();
        url.search = serialized ? `?${serialized}` : "";
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
        // the etag feature in mongo is not implemented yet
        this.etagEnabled = enabled;
        return this;
    }
    /**
     * Specify a custom Pool factory for postgresql. Useful for tests.
     *
     * @param factory
     * @returns cosmosBuilder
     */
    withPostgresPoolFactory(factory) {
        this.postgresPoolFactory = factory;
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
        if (this.dbType === CosmosBuilder.POSTGRES) {
            return new PostgresImpl_1.PostgresImpl(this.connectionString, this.postgresPoolFactory);
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
/**
 * Constant for dbType: postgres
 */
CosmosBuilder.POSTGRES = "postgres";
//# sourceMappingURL=CosmosBuilder.js.map