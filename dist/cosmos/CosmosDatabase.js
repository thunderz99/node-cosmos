"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosDatabase = exports.CosmosError = void 0;
const Condition_1 = require("./condition/Condition");
const assert_1 = require("../util/assert");
const RetryUtil_1 = require("../util/RetryUtil");
class CosmosError {
    constructor(errorResponse) {
        this.name = "CosmosError";
        Object.assign(this, errorResponse);
        this.message = errorResponse.message || "";
        this.code = errorResponse.code || errorResponse.statusCode;
    }
}
exports.CosmosError = CosmosError;
const _partition = "_partition"; // Partition KeyName
/**
 * Remove unused cosmosdb system properties(e.g. _self / _rid / _attachments)
 * @param item
 */
const removeUnusedProps = (item) => {
    if (item) {
        Object.keys(item)
            .filter((k) => k.startsWith("_") && k !== "_ts" && k !== _partition && k !== "_etag")
            .forEach((k) => delete item[k]);
    }
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
class CosmosDatabase {
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
        const partitionKey = "/" + _partition;
        const conf = { id: coll, partitionKey, defaultTtl: -1 };
        const { container } = await database.containers.createIfNotExists(conf);
        return container;
    }
    /**
     *
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
    /**
     * Create an item.
     * @param coll
     * @param data
     * @param partition
     */
    async create(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        if (data.id) {
            // if id is specified explictly, check if a valid one.
            checkValidId(data.id);
        }
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const { resource } = await RetryUtil_1.executeWithRetry(() => container.items.create(_data));
        assert_1.assertIsDefined(resource, `item, coll:${coll}, data:${data}, partition:${partition}`);
        console.info(`created. coll:${coll}, resource:${resource.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }
    /**
     * Read an item. Throw DocumentClientException(404 NotFound) if object not exist
     *
     * @param coll
     * @param id
     * @param partition
     */
    async read(coll, id, partition = coll) {
        const container = await this.getCollection(coll);
        const item = container.item(id, partition);
        const itemResponse = await RetryUtil_1.executeWithRetry(() => item.read());
        const { statusCode, resource } = itemResponse;
        if (statusCode === 404) {
            throw new CosmosError(itemResponse);
        }
        assert_1.assertIsDefined(resource);
        return resource;
    }
    /**
     * Read an item. return defaultValue if item not exist
     *
     * @param coll
     * @param id
     * @param partition
     * @param defaultValue defaultValue if item not exist
     */
    async readOrDefault(coll, id, partition, defaultValue) {
        const container = await this.getCollection(coll);
        const item = container.item(id, partition);
        try {
            const itemResponse = await RetryUtil_1.executeWithRetry(() => item.read());
            const { statusCode, resource } = itemResponse;
            if (statusCode >= 400) {
                throw new CosmosError(itemResponse);
            }
            assert_1.assertIsDefined(resource);
            return resource;
        }
        catch (e) {
            if (e.code === 404) {
                return defaultValue;
            }
            else {
                throw e;
            }
        }
    }
    /**
     * Upsert an item. Insert will be performed if not exist. Do not support partial update.
     * @param coll
     * @param data
     * @param partition
     */
    async upsert(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        assert_1.assertIsDefined(data.id, "data.id");
        checkValidId(data.id);
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const { resource } = await RetryUtil_1.executeWithRetry(() => container.items.upsert(_data));
        assert_1.assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }
    /**
     * Update an item. Supports partial update. Error will be throw if not exist.
     * @param coll
     * @param data
     * @param partition
     */
    async update(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        assert_1.assertIsDefined(data.id, "data.id");
        checkValidId(data.id);
        const item = container.item(data.id, partition);
        const { resource: toUpdate } = await item.read();
        assert_1.assertIsDefined(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
        Object.assign(toUpdate, data);
        const { resource: updated } = await RetryUtil_1.executeWithRetry(() => item.replace(toUpdate));
        assert_1.assertIsDefined(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`updated. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(updated);
    }
    /**
     * Delete an item. Return {id} if exist. Otherwise return undefined.
     *
     * @param coll
     * @param id
     * @param partition
     */
    async delete(coll, id, partition = coll) {
        const container = await this.getCollection(coll);
        const item = container.item(id, partition);
        try {
            await RetryUtil_1.executeWithRetry(() => item.delete());
            console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
            return { id };
        }
        catch (e) {
            if (e.code === 404) {
                return undefined;
            }
            else {
                throw e;
            }
        }
    }
    /**
     * find data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    async find(coll, condition, partition) {
        const container = await this.getCollection(coll);
        const partitionKey = partition;
        const options = { partitionKey };
        const querySpec = Condition_1.toQuerySpec(condition);
        const iter = await RetryUtil_1.executeWithRetry(async () => container.items.query(querySpec, options));
        const response = await iter.fetchAll();
        const ret = response.resources || [];
        return ret.map((item) => removeUnusedProps(item));
    }
    /**
     * find data by SQL
     * using SQL-like syntax
     * https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/cosmosdb/cosmos/README.md#query-the-database
     * @param coll
     * @param query
     * @param partition
     */
    async findBySQL(coll, query, partition) {
        const container = await this.getCollection(coll);
        const partitionKey = partition;
        const options = { partitionKey };
        const iter = await RetryUtil_1.executeWithRetry(async () => container.items.query(query, options));
        const response = await iter.fetchAll();
        const ret = response.resources || [];
        return ret.map((item) => removeUnusedProps(item));
    }
    /**
     * count data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    async count(coll, condition, partition) {
        const container = await this.getCollection(coll);
        const partitionKey = partition;
        const options = { partitionKey };
        const querySpec = Condition_1.toQuerySpec(condition, true);
        const iter = await RetryUtil_1.executeWithRetry(async () => container.items.query(querySpec, options));
        const res = await RetryUtil_1.executeWithRetry(async () => iter.fetchNext());
        const [{ $1: total }] = res.resources;
        return total;
    }
}
exports.CosmosDatabase = CosmosDatabase;
//# sourceMappingURL=CosmosDatabase.js.map