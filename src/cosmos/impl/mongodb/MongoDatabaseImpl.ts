import { Condition, toQuerySpec } from "../../condition/Condition";
import {
    Container,
    CosmosClient,
    Database,
    FeedOptions,
    FeedResponse,
    ItemDefinition,
    ItemResponse,
    QueryIterator,
} from "@azure/cosmos";
import { CosmosDatabase, CosmosDocument, CosmosError, CosmosId } from "../../CosmosDatabase";
import { Db, MongoClient } from "mongodb";

import { CosmosContainer } from "../../CosmosContainer";
import { CosmosDatabaseImpl } from "../cosmosdb/CosmosDatabaseImpl";
import { assertIsDefined } from "../../../util/assert";
import { executeWithRetry } from "../../../util/RetryUtil";

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
    private readonly database: Db;
    private readonly collectionMap: Map<string, CosmosContainer> = new Map();

    constructor(client: MongoClient, database: Db) {
        this.client = client;
        this.database = database;
    }

    /**
     * Create a collection if not exists
     * @param coll
     */
    public async createCollection(coll: string): Promise<CosmosContainer> {
        const { database } = this;
        const collection = await database.createCollection(coll);
        return new CosmosContainer(coll, collection);
    }

    /**
     * Delete a collection if exists
     * @param coll
     */
    public async deleteCollection(coll: string): Promise<void> {
        const { database } = this;
        await database.collection(coll).drop();
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

    // /**
    //  * Create an item.
    //  * @param coll
    //  * @param data
    //  * @param partition
    //  */
    // public async create(
    //     coll: string,
    //     data: CosmosDocument,
    //     partition: string = coll,
    // ): Promise<CosmosDocument> {
    //     const container = await this.getCollection(coll);

    //     if (data.id) {
    //         // if id is specified explicitly, check if a valid one.
    //         checkValidId(data.id);
    //     }

    //     const _data = {};
    //     Object.assign(_data, data);
    //     Object.assign(_data, { [_partition]: partition });

    //     const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
    //         container.items.create(_data),
    //     );
    //     assertIsDefined(
    //         resource,
    //         `item, coll:${coll}, data:${JSON.stringify(data)}, partition:${partition}`,
    //     );
    //     console.info(`created. coll:${coll}, resource:${resource.id}, partition:${partition}`);

    //     return removeUnusedProps(resource);
    // }

    // /**
    //  * Read an item. Throw DocumentClientException(404 NotFound) if object not exist
    //  *
    //  * @param coll
    //  * @param id
    //  * @param partition
    //  */
    // public async read(coll: string, id: string, partition: string = coll): Promise<CosmosDocument> {
    //     const container = await this.getCollection(coll);

    //     const item = container.item(id, partition);
    //     const itemResponse = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
    //         item.read<CosmosDocument>(),
    //     );

    //     const { statusCode, resource } = itemResponse;

    //     if (statusCode === 404) {
    //         throw new CosmosError(itemResponse);
    //     }

    //     assertIsDefined(resource);

    //     return resource;
    // }

    // /**
    //  * Read an item. return defaultValue if item not exist
    //  *
    //  * @param coll
    //  * @param id
    //  * @param partition
    //  * @param defaultValue defaultValue if item not exist
    //  */
    // public async readOrDefault(
    //     coll: string,
    //     id: string,
    //     partition: string,
    //     defaultValue: CosmosDocument | null,
    // ): Promise<CosmosDocument | null> {
    //     const container = await this.getCollection(coll);

    //     const item = container.item(id, partition);
    //     try {
    //         const itemResponse = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
    //             item.read<CosmosDocument>(),
    //         );

    //         const { statusCode, resource } = itemResponse;

    //         if (statusCode >= 400) {
    //             throw new CosmosError(itemResponse);
    //         }

    //         assertIsDefined(resource);

    //         return resource;
    //     } catch (e) {
    //         if (typeof e === "object" && e !== null && "code" in e && e.code === 404) {
    //             return defaultValue;
    //         } else {
    //             throw e;
    //         }
    //     }
    // }

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
}
