"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDatabaseImpl = void 0;
const Condition_1 = require("../../condition/Condition");
const CosmosDatabase_1 = require("../../CosmosDatabase");
const assert_1 = require("../../../util/assert");
const ConditionUtil_1 = require("./util/ConditionUtil");
const CosmosContainer_1 = require("../../CosmosContainer");
const uuid_1 = require("uuid");
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
    constructor(client, cosmosAccount) {
        this.collectionMap = new Map();
        this.client = client;
        this.cosmosAccount = cosmosAccount;
    }
    /**
     * Create a collection if not exists
     * @param coll
     */
    async createCollection(coll) {
        const { cosmosAccount } = this;
        // in mongodb, we use database for a cosmos container
        // and use collection for a cosmos partition
        // because mongo does not support partition
        await cosmosAccount.getDatabase(coll);
        const nativeDb = this.client.db(coll);
        return new CosmosContainer_1.CosmosContainer(coll, nativeDb);
    }
    /**
     * Delete a collection if exists
     * @param coll
     */
    async deleteCollection(coll) {
        const { cosmosAccount } = this;
        await cosmosAccount.deleteDatabase(coll);
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
    /**
     * Create an item.
     * @param coll
     * @param data
     * @param partition
     */
    async create(coll, data, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container;
        // this represent a cosmos partition
        const collection = db.collection(partition);
        const id = data.id || (0, uuid_1.v4)().toString();
        //check if id a valid one.
        checkValidId(id);
        const _data = {};
        Object.assign(_data, data);
        // add _partition
        Object.assign(_data, { [_partition]: partition });
        // add _id for mongo
        Object.assign(_data, { _id: id });
        // add _ts for mongo
        _addTimestamp(_data);
        const insertResult = await collection.insertOne(_data);
        const resource = await collection.findOne({
            _id: insertResult.insertedId,
        });
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
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(id, "id");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        const db = container.container;
        const collection = db.collection(partition);
        const resource = await collection.findOne({ id: id });
        if (!resource) {
            throw new CosmosDatabase_1.CosmosError(undefined, 404, `item not found. id:${id}`);
        }
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
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(id, "id");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        const db = container.container;
        const collection = db.collection(partition);
        const resource = await collection.findOne({ id: id });
        return resource || defaultValue;
    }
    /**
     * Upsert an item. Insert will be performed if not exist. Do not support partial update.
     * @param coll
     * @param data
     * @param partition
     */
    async upsert(coll, data, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container;
        // this represent a cosmos partition
        const collection = db.collection(partition);
        const id = data.id || (0, uuid_1.v4)().toString();
        //check if id a valid one.
        checkValidId(id);
        const _data = {};
        Object.assign(_data, data);
        // add _partition
        Object.assign(_data, { [_partition]: partition });
        // add _id for mongo
        Object.assign(_data, { _id: id });
        // add _ts for mongo
        _addTimestamp(_data);
        const resource = await collection.findOneAndReplace({ id: id }, // Query by _id
        _data, // Set new data
        {
            upsert: true,
            returnDocument: "after", // Return the updated document
        });
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
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container;
        // this represent a cosmos partition
        const collection = db.collection(partition);
        const id = data.id || (0, uuid_1.v4)().toString();
        //check if id a valid one.
        checkValidId(id);
        const _data = {};
        Object.assign(_data, data);
        // add _partition
        Object.assign(_data, { [_partition]: partition });
        // add _id for mongo
        Object.assign(_data, { _id: id });
        // add _ts for mongo
        _addTimestamp(_data);
        const resource = await collection.findOneAndUpdate({ id: id }, // Query by _id
        { $set: _data }, // Set new data
        {
            upsert: false,
            returnDocument: "after", // Return the updated document
        });
        (0, assert_1.assertIsDefined)(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }
    /**
     * Delete an item. Return {id} if exist. Otherwise return undefined.
     *
     * @param coll
     * @param id
     * @param partition
     */
    async delete(coll, id, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(id, "id");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        const db = container.container;
        const collection = db.collection(partition);
        await collection.deleteOne({ id: id });
        console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
        return { id };
    }
    /**
     * find data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    async find(coll, condition, partition) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        console.info(`find coll:${coll}, partition:${partition}`);
        if (!partition) {
            throw new Error("partition cannot be set to null. cross-partition is not supported for mongodb");
        }
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container;
        // this represent a cosmos partition
        const collection = db.collection(partition);
        // Define filter, sort, skip, and limit
        const filter = ConditionUtil_1.ConditionUtil.toBsonFilter((0, Condition_1._flatten)(condition.filter));
        const sort = ConditionUtil_1.ConditionUtil.toBsonSort(condition.sort);
        const skip = condition.offset || 0;
        const limit = condition.limit || Condition_1.DEFAULT_LIMIT;
        // Find documents using the defined options
        const ret = await collection
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
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
        console.info(`findBySQL coll:${coll}, partition:${partition}`);
        throw new Error("findBySQL is not supported for mongodb");
    }
    /**
     * count data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    async count(coll, condition, partition) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        console.info(`count coll:${coll}, partition:${partition}`);
        if (!partition) {
            throw new Error("partition cannot be set to null. cross-partition is not supported for mongodb");
        }
        const container = await this.getCollection(coll);
        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container;
        // this represent a cosmos partition
        const collection = db.collection(partition);
        // Define filter, sort, skip, and limit
        const filter = ConditionUtil_1.ConditionUtil.toBsonFilter(condition.filter);
        // Find documents using the defined options
        return await collection.countDocuments(filter);
    }
}
exports.MongoDatabaseImpl = MongoDatabaseImpl;
/**
 * add timestamp field(_ts) to data. we use epoch seconds with milliseconds as double(e.g. 1714546148.123d)
 * so when we use sort on _ts, we can get a more stable sort order.
 * @param _data the json data
 */
const _addTimestamp = (_data) => {
    const epochMillis = Date.now();
    Object.assign(_data, { _ts: epochMillis / 1000 });
};
//# sourceMappingURL=MongoDatabaseImpl.js.map