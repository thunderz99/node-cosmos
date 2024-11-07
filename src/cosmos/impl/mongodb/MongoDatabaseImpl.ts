import { Collection, Db, Filter, MongoClient, ObjectId } from "mongodb";
import { Condition, DEFAULT_LIMIT, _flatten, toQuerySpec } from "../../condition/Condition";
import { CosmosDocument, CosmosError, CosmosId } from "../../CosmosDatabase";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";

import { ConditionUtil } from "./util/ConditionUtil";
import { Cosmos } from "../../Cosmos";
import { CosmosContainer } from "../../CosmosContainer";
import { executeWithRetry } from "../../../util/RetryUtil";
import { v4 as uuidv4 } from "uuid";

const _partition = "_partition"; // Partition KeyName

/**
 * In mongodb, do not need to remove _xxx system fields
 * @param item
 */
const removeUnusedProps = (item: CosmosDocument) => {
    return item;
};

/**
 * check if id is valid
 * @param id
 */
const checkValidId = (id: string) => {
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
export class MongoDatabaseImpl {
    private readonly client: MongoClient;
    private readonly cosmosAccount: Cosmos;
    private readonly collectionMap: Map<string, CosmosContainer> = new Map();

    constructor(client: MongoClient, cosmosAccount: Cosmos) {
        this.client = client;
        this.cosmosAccount = cosmosAccount;
    }

    /**
     * Create a collection if not exists
     * @param coll
     */
    public async createCollection(coll: string): Promise<CosmosContainer> {
        const { cosmosAccount } = this;
        // in mongodb, we use database for a cosmos container
        // and use collection for a cosmos partition
        // because mongo does not support partition
        await cosmosAccount.getDatabase(coll);
        const nativeDb = this.client.db(coll);
        return new CosmosContainer(coll, nativeDb);
    }

    /**
     * Delete a collection if exists
     * @param coll
     */
    public async deleteCollection(coll: string): Promise<void> {
        const { cosmosAccount } = this;
        await cosmosAccount.deleteDatabase(coll);
    }

    /**
     * Get a collection. If not exist, the collection will be created.
     * @param coll
     */
    public async getCollection(coll: string): Promise<CosmosContainer> {
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
    public async create(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container as Db;

        // this represent a cosmos partition
        const collection = db.collection(partition);

        const id = data.id || uuidv4().toString();

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
        const resource = await collection.findOne<CosmosDocument>({
            _id: insertResult.insertedId,
        });

        assertIsDefined(
            resource,
            `item, coll:${coll}, data:${JSON.stringify(data)}, partition:${partition}`,
        );

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
    public async read(coll: string, id: string, partition: string = coll): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(id, "id");
        assertNotEmpty(partition, "partition");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        const db = container.container as Db;

        const collection = db.collection(partition);

        const resource = await collection.findOne<CosmosDocument>({ id: id });

        if (!resource) {
            throw new CosmosError(undefined, 404, `item not found. id:${id}`);
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
    public async readOrDefault(
        coll: string,
        id: string,
        partition: string,
        defaultValue: CosmosDocument | null,
    ): Promise<CosmosDocument | null> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(id, "id");
        assertNotEmpty(partition, "partition");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        const db = container.container as Db;

        const collection = db.collection(partition);

        const resource = await collection.findOne<CosmosDocument>({ id: id });

        return resource || defaultValue;
    }

    /**
     * Upsert an item. Insert will be performed if not exist. Do not support partial update.
     * @param coll
     * @param data
     * @param partition
     */
    public async upsert(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container as Db;

        // this represent a cosmos partition
        const collection = db.collection(partition);

        const id = data.id || uuidv4().toString();

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

        const resource = await collection.findOneAndReplace(
            { id: id }, // Query by _id
            _data, // Set new data
            {
                upsert: true, // Enable upsert
                returnDocument: "after", // Return the updated document
            },
        );

        assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }

    /**
     * Update an item. Supports partial update. Error will be throw if not exist.
     * @param coll
     * @param data
     * @param partition
     */
    public async update(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container as Db;

        // this represent a cosmos partition
        const collection = db.collection(partition);

        const id = data.id || uuidv4().toString();

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

        const resource = await collection.findOneAndUpdate(
            { id: id }, // Query by _id
            { $set: _data }, // Set new data
            {
                upsert: false, // normal update(not an upsert)
                returnDocument: "after", // Return the updated document
            },
        );

        assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
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
    public async delete(coll: string, id: string, partition: string = coll): Promise<CosmosId> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(id, "id");
        assertNotEmpty(partition, "partition");

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        const db = container.container as Db;

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
    public async find(
        coll: string,
        condition: Condition,
        partition?: string,
    ): Promise<CosmosDocument[]> {
        assertNotEmpty(coll, "coll");

        console.info(`find coll:${coll}, partition:${partition}`);
        if (!partition) {
            throw new Error(
                "partition cannot be set to null. cross-partition is not supported for mongodb",
            );
        }

        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container as Db;

        // this represent a cosmos partition
        const collection = db.collection(partition);

        // Define filter, sort, skip, and limit
        const filter = ConditionUtil.toBsonFilter(_flatten(condition.filter));
        const sort = ConditionUtil.toBsonSort(condition.sort);
        const skip = condition.offset || 0;
        const limit = condition.limit || DEFAULT_LIMIT;

        // Find documents using the defined options
        const ret = await collection
            .find<CosmosDocument>(filter)
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
    public async findBySQL(
        coll: string,
        query: string,
        partition?: string,
    ): Promise<CosmosDocument[]> {
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
    public async count(coll: string, condition: Condition, partition?: string): Promise<number> {
        assertNotEmpty(coll, "coll");

        console.info(`count coll:${coll}, partition:${partition}`);
        if (!partition) {
            throw new Error(
                "partition cannot be set to null. cross-partition is not supported for mongodb",
            );
        }
        const container = await this.getCollection(coll);

        // get the native Db obj for mongo sdk
        // this represent a cosmos container
        const db = container.container as Db;

        // this represent a cosmos partition
        const collection = db.collection(partition);

        // Define filter, sort, skip, and limit
        const filter = ConditionUtil.toBsonFilter(condition.filter);

        // Find documents using the defined options
        return await collection.countDocuments(filter);
    }
}

/**
 * add timestamp field(_ts) to data. we use epoch seconds with milliseconds as double(e.g. 1714546148.123d)
 * so when we use sort on _ts, we can get a more stable sort order.
 * @param _data the json data
 */
const _addTimestamp = (_data: Record<string, unknown>): void => {
    const epochMillis: number = Date.now();
    Object.assign(_data, { _ts: epochMillis / 1000 });
};
