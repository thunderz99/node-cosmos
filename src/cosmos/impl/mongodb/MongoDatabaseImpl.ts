import { Collection, Db, MongoClient, ObjectId } from "mongodb";
import { Condition, toQuerySpec } from "../../condition/Condition";
import { CosmosDocument, CosmosError, CosmosId } from "../../CosmosDatabase";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";

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
        const database = await cosmosAccount.getDatabase(coll);
        return new CosmosContainer(coll, database);
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

        // add_
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

        const resource = await collection.findOne<CosmosDocument>({ _id: new ObjectId(id) });

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

        const resource = await collection.findOne<CosmosDocument>({ _id: new ObjectId(id) });

        return resource || defaultValue;
    }

    // /**
    //  * Upsert an item. Insert will be performed if not exist. Do not support partial update.
    //  * @param coll
    //  * @param data
    //  * @param partition
    //  */
    // public async upsert(
    //     coll: string,
    //     data: CosmosDocument,
    //     partition: string = coll,
    // ): Promise<CosmosDocument> {
    //     const container = await this.getCollection(coll);
    //     assertIsDefined(data.id, "data.id");
    //     checkValidId(data.id);

    //     const _data = {};
    //     Object.assign(_data, data);
    //     Object.assign(_data, { [_partition]: partition });

    //     const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
    //         container.items.upsert(_data),
    //     );
    //     assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
    //     console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
    //     return removeUnusedProps(resource);
    // }

    // /**
    //  * Update an item. Supports partial update. Error will be throw if not exist.
    //  * @param coll
    //  * @param data
    //  * @param partition
    //  */
    // public async update(
    //     coll: string,
    //     data: CosmosDocument,
    //     partition: string = coll,
    // ): Promise<CosmosDocument> {
    //     const container = await this.getCollection(coll);

    //     assertIsDefined(data.id, "data.id");
    //     checkValidId(data.id);

    //     const item = container.item(data.id, partition);
    //     const { resource: toUpdate } = await item.read<CosmosDocument>();
    //     assertIsDefined(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
    //     Object.assign(toUpdate, data);

    //     const { resource: updated } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
    //         item.replace(toUpdate),
    //     );
    //     assertIsDefined(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
    //     console.info(`updated. coll:${coll}, id:${data.id}, partition:${partition}`);
    //     return removeUnusedProps(updated);
    // }

    // /**
    //  * Delete an item. Return {id} if exist. Otherwise return undefined.
    //  *
    //  * @param coll
    //  * @param id
    //  * @param partition
    //  */
    // public async delete(coll: string, id: string, partition: string = coll): Promise<CosmosId> {
    //     const container = await this.getCollection(coll);

    //     const item = container.item(id, partition);

    //     try {
    //         await executeWithRetry<ItemResponse<ItemDefinition>>(() => item.delete());
    //         console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
    //         return { id };
    //     } catch (e) {
    //         if (typeof e === "object" && e !== null && "code" in e && e.code === 404) {
    //             return undefined;
    //         } else {
    //             throw e;
    //         }
    //     }
    // }

    // /**
    //  * find data by condition
    //  *
    //  * @param coll
    //  * @param condition
    //  * @param partition
    //  */
    // public async find(
    //     coll: string,
    //     condition: Condition,
    //     partition?: string,
    // ): Promise<CosmosDocument[]> {
    //     const container = await this.getCollection(coll);

    //     const partitionKey = partition;

    //     const options: FeedOptions = { partitionKey };

    //     const querySpec = toQuerySpec(condition);

    //     const iter = await executeWithRetry<QueryIterator<CosmosDocument>>(async () =>
    //         container.items.query(querySpec, options),
    //     );

    //     const response = await iter.fetchAll();
    //     const ret = response.resources || [];

    //     return ret.map((item) => removeUnusedProps(item));
    // }

    // /**
    //  * find data by SQL
    //  * using SQL-like syntax
    //  * https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/cosmosdb/cosmos/README.md#query-the-database
    //  * @param coll
    //  * @param query
    //  * @param partition
    //  */
    // public async findBySQL(
    //     coll: string,
    //     query: string,
    //     partition?: string,
    // ): Promise<CosmosDocument[]> {
    //     const container = await this.getCollection(coll);

    //     const partitionKey = partition;

    //     const options: FeedOptions = { partitionKey };

    //     const iter = await executeWithRetry<QueryIterator<CosmosDocument>>(async () =>
    //         container.items.query(query, options),
    //     );

    //     const response = await iter.fetchAll();
    //     const ret = response.resources || [];

    //     return ret.map((item) => removeUnusedProps(item));
    // }

    // /**
    //  * count data by condition
    //  *
    //  * @param coll
    //  * @param condition
    //  * @param partition
    //  */
    // public async count(coll: string, condition: Condition, partition?: string): Promise<number> {
    //     const container = await this.getCollection(coll);

    //     const partitionKey = partition;
    //     const options: FeedOptions = { partitionKey };

    //     const querySpec = toQuerySpec(condition, true);

    //     const iter = await executeWithRetry<QueryIterator<CosmosDocument>>(async () =>
    //         container.items.query(querySpec, options),
    //     );

    //     const res = await executeWithRetry<FeedResponse<CosmosDocument>>(async () =>
    //         iter.fetchNext(),
    //     );

    //     const [{ $1: total }] = res.resources;

    //     return total;
    // }

    private privateGreeting(): void {
        console.log("Hello from the private method!");
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
