"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDatabaseImpl = void 0;
const CosmosContainer_1 = require("../../CosmosContainer");
const _partition = "_partition"; // Partition KeyName
/**
 * In mongodb, do not need to remove _xxx system fields
 * @param item
 */
const removeUnusedProps = (item) => {
    return item;
};
/**
 * check if id is valid
 * @param id
 */
const checkValidId = (id) => {
    if (!id) {
        throw new Error("id cannot be empty");
    }
    if (id.includes("\t") || id.includes("\n") || id.includes("\r")) {
        throw new Error("id cannot contain \t or \n or \r");
    }
};
/**
 * class represents a Cosmos Database
 */
class MongoDatabaseImpl {
    constructor(client, database) {
        this.collectionMap = new Map();
        this.client = client;
        this.database = database;
    }
    /**
     * Create a collection if not exists
     * @param coll
     */
    async createCollection(coll) {
        const { database } = this;
        const collection = await database.createCollection(coll);
        return new CosmosContainer_1.CosmosContainer(coll, collection);
    }
    /**
     * Delete a collection if exists
     * @param coll
     */
    async deleteCollection(coll) {
        const { database } = this;
        await database.collection(coll).drop();
    }
    /**
     * Get a collection. If not exist, the collection will be created.
     * @param coll
     */
    async getCollection(coll) {
        const { collectionMap } = this;
        let collection = collectionMap.get(coll);
        if (!collection) {
            collection = await this.createCollection(coll);
            collectionMap.set(coll, collection);
        }
        return collection;
    }
}
exports.MongoDatabaseImpl = MongoDatabaseImpl;
//# sourceMappingURL=MongoDatabaseImpl.js.map