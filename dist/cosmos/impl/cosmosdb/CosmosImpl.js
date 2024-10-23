"use strict";
// eslint-disable-next-line @typescript-eslint/no-empty-interface
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosImpl = void 0;
const assert_1 = require("../../../util/assert");
const cosmos_1 = require("@azure/cosmos");
const CosmosDatabaseImpl_1 = require("./CosmosDatabaseImpl");
const assert_2 = __importDefault(require("assert"));
const split = (connectionString) => {
    const parts = /AccountEndpoint=(.+);AccountKey=(.+);/.exec(connectionString);
    assert_2.default(parts, `connectionString should contain AccountEndpoint and AccountKey: ${connectionString}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, endpoint, key] = parts;
    return { endpoint, key };
};
/**
 * class that represent a cosmos account
 *
 * Usage:
 * const cosmos = new Cosmos("AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx==;")
 * const db = cosmos.getDatabase("Database1")
 *
 * //Then use db to do CRUD / query
 * db.upsert("Users", user)
 *
 */
class CosmosImpl {
    constructor(connectionString) {
        this.databaseMap = new Map();
        assert_1.assertIsDefined(connectionString, "connectionString");
        const { endpoint, key } = split(connectionString);
        assert_1.assertNotEmpty(endpoint);
        assert_1.assertNotEmpty(key);
        this.client = new cosmos_1.CosmosClient({ endpoint, key });
        console.info(`cosmos endpoint: ${endpoint}`);
        console.info(`cosmos key: ${key.substring(0, 3)}...`);
    }
    async getDatabase(db) {
        const { client, databaseMap } = this;
        const database = databaseMap.get(db);
        if (database) {
            return database;
        }
        const options = {
            offerEnableRUPerMinuteThroughput: true,
            offerThroughput: 400,
        };
        const dbResource = (await client.databases.createIfNotExists({ id: db }, options)).database;
        const newDatabase = new CosmosDatabaseImpl_1.CosmosDatabaseImpl(client, dbResource);
        databaseMap.set(db, newDatabase);
        return newDatabase;
    }
    async deleteDatabase(db) {
        this.databaseMap.delete(db);
        await this.client.database(db).delete();
    }
}
exports.CosmosImpl = CosmosImpl;
//# sourceMappingURL=CosmosImpl.js.map