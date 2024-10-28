"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosDatabaseImpl = void 0;
const Condition_1 = require("../../condition/Condition");
const CosmosDatabase_1 = require("../../CosmosDatabase");
const CosmosContainer_1 = require("../../CosmosContainer");
const assert_1 = require("../../../util/assert");
const RetryUtil_1 = require("../../../util/RetryUtil");
const _partition = "_partition"; // Partition KeyName
const reservedFields = new Set(["_ts", "_partition", "_etag"]);
/**
 * Remove unused cosmosdb system properties(e.g. _self / _rid / _attachments)
 * @param item
 */
const removeUnusedProps = (item) => {
    if (item) {
        Object.keys(item)
            .filter((k) => k.startsWith("_") && !reservedFields.has(k))
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
class CosmosDatabaseImpl {
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
        return new CosmosContainer_1.CosmosContainer(coll, container);
    }
    /**
     * Delete a collection if exists
     * @param coll
     */
    async deleteCollection(coll) {
        const { database } = this;
        await database.container(coll).delete();
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
            // if id is specified explicitly, check if a valid one.
            checkValidId(data.id);
        }
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const containerInstance = container.container;
        const { resource } = await (0, RetryUtil_1.executeWithRetry)(() => containerInstance.items.create(_data));
        (0, assert_1.assertIsDefined)(resource, `item, coll:${coll}, data:${JSON.stringify(data)}, partition:${partition}`);
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
        const containerInstance = container.container;
        const item = containerInstance.item(id, partition);
        const itemResponse = await (0, RetryUtil_1.executeWithRetry)(() => item.read());
        const { statusCode, resource } = itemResponse;
        if (statusCode === 404) {
            throw new CosmosDatabase_1.CosmosError(itemResponse);
        }
        (0, assert_1.assertIsDefined)(resource);
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
        const containerInstance = container.container;
        const item = containerInstance.item(id, partition);
        try {
            const itemResponse = await (0, RetryUtil_1.executeWithRetry)(() => item.read());
            const { statusCode, resource } = itemResponse;
            if (statusCode >= 400) {
                throw new CosmosDatabase_1.CosmosError(itemResponse);
            }
            (0, assert_1.assertIsDefined)(resource);
            return resource;
        }
        catch (e) {
            if (typeof e === "object" && e !== null && "code" in e && e.code === 404) {
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
        (0, assert_1.assertIsDefined)(data.id, "data.id");
        checkValidId(data.id);
        const container = await this.getCollection(coll);
        const containerInstance = container.container;
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const { resource } = await (0, RetryUtil_1.executeWithRetry)(() => containerInstance.items.upsert(_data));
        (0, assert_1.assertIsDefined)(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
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
        (0, assert_1.assertIsDefined)(data.id, "data.id");
        checkValidId(data.id);
        const container = await this.getCollection(coll);
        const containerInstance = container.container;
        const item = containerInstance.item(data.id, partition);
        const { resource: toUpdate } = await item.read();
        (0, assert_1.assertIsDefined)(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
        Object.assign(toUpdate, data);
        const { resource: updated } = await (0, RetryUtil_1.executeWithRetry)(() => item.replace(toUpdate));
        (0, assert_1.assertIsDefined)(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
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
        const containerInstance = container.container;
        const item = containerInstance.item(id, partition);
        try {
            await (0, RetryUtil_1.executeWithRetry)(() => item.delete());
            console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
            return { id };
        }
        catch (e) {
            if (typeof e === "object" && e !== null && "code" in e && e.code === 404) {
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
        const containerInstance = container.container;
        const partitionKey = partition;
        const options = { partitionKey };
        const querySpec = (0, Condition_1.toQuerySpec)(condition);
        const iter = await (0, RetryUtil_1.executeWithRetry)(async () => containerInstance.items.query(querySpec, options));
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
        const containerInstance = container.container;
        const partitionKey = partition;
        const options = { partitionKey };
        const iter = await (0, RetryUtil_1.executeWithRetry)(async () => containerInstance.items.query(query, options));
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
        const containerInstance = container.container;
        const partitionKey = partition;
        const options = { partitionKey };
        const querySpec = (0, Condition_1.toQuerySpec)(condition, true);
        const iter = await (0, RetryUtil_1.executeWithRetry)(async () => containerInstance.items.query(querySpec, options));
        const res = await (0, RetryUtil_1.executeWithRetry)(async () => iter.fetchNext());
        const [{ $1: total }] = res.resources;
        return total;
    }
}
exports.CosmosDatabaseImpl = CosmosDatabaseImpl;
//# sourceMappingURL=CosmosDatabaseImpl.js.map