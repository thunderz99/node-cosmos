"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoImpl = void 0;
const mongodb_1 = require("mongodb");
const assert_1 = require("../../../util/assert");
const MongoDatabaseImpl_1 = require("./MongoDatabaseImpl");
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
class MongoImpl {
    constructor(connectionString, expireAtEnabled = false, etagEnabled = false) {
        /**
         * A cache of <dbName, CosmosDatabase instance>, in order to get the instance quickly
         */
        this.databaseMap = new Map();
        /**
         * A flag in memory to represent whether the native mongo client is connected to mongodb
         */
        this.connected = false;
        (0, assert_1.assertIsDefined)(connectionString, "connectionString");
        (0, assert_1.assertNotEmpty)(connectionString, "connectionString");
        this.client = new mongodb_1.MongoClient(connectionString);
        this.expireAtEnabled = expireAtEnabled;
        this.etagEnabled = etagEnabled;
    }
    async getDatabase(db) {
        const { client, databaseMap } = this;
        const database = databaseMap.get(db);
        if (database) {
            console.info("database exist.");
            return database;
        }
        console.info(`database not exist. create and connect. this.connected: ${this.connected}`);
        if (!this.connected) {
            await this.client.connect();
            this.connected = true;
            console.info("mongo client connected");
        }
        await this._createDatabaseIfNotExist(db);
        const newDatabase = new MongoDatabaseImpl_1.MongoDatabaseImpl(client, this);
        const ret = newDatabase;
        databaseMap.set(db, ret);
        return ret;
    }
    async deleteDatabase(db) {
        this.databaseMap.delete(db);
        await this.client.db(db).dropDatabase();
    }
    async _createDatabaseIfNotExist(dbName) {
        // get db list
        const databases = await this.client.db().admin().listDatabases();
        const dbExists = databases.databases.some((db) => db.name === dbName);
        if (dbExists) {
            return this.client.db(dbName);
        }
        // if not exist, create the db by creating a collection
        console.log(`Database "${dbName}" does not exist. Creating...`);
        const db = this.client.db(dbName);
        const collectionName = "PING";
        await db.createCollection(collectionName);
        console.info(`Database "${dbName}" created with collection "${collectionName}".`);
        return db;
    }
    async close() {
        this.client.close();
    }
    /**
     * Get expireAtEnabled
     * @returns expireAtEnabled in boolean
     */
    getExpireAtEnabled() {
        return this.expireAtEnabled;
    }
    /**
     * Get etagEnabled
     * @returns etagEnabled in boolean
     */
    getEtagEnabled() {
        return this.etagEnabled;
    }
}
exports.MongoImpl = MongoImpl;
//# sourceMappingURL=MongoImpl.js.map