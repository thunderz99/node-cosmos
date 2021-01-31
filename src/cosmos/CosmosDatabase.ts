import { Condition, toQuerySpec } from "./condition/Condition";
import {
    Container,
    CosmosClient,
    Database,
    ErrorResponse,
    FeedOptions,
    FeedResponse,
    ItemDefinition,
    ItemResponse,
    QueryIterator,
} from "@azure/cosmos";

import { assertIsDefined } from "../util/assert";
import { executeWithRetry } from "../util/RetryUtil";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type CosmosDocument = ItemDefinition;

export type CosmosId =
    | {
          id: string;
      }
    | undefined;

export class CosmosError implements ErrorResponse {
    name = "CosmosError";
    message: string;

    constructor(init: Partial<ErrorResponse>) {
        Object.assign(this, init);
        this.message = init.message || "";
    }
}

const _partition = "_partition"; // Partition KeyName

/**
 * Remove unused cosmosdb system properties(e.g. _self / _rid / _attachments)
 * @param item
 */
const removeUnusedProps = (item: CosmosDocument) => {
    if (item) {
        Object.keys(item)
            .filter((k) => k.startsWith("_") && k !== "_ts" && k !== _partition && k !== "_etag")
            .forEach((k) => delete item[k]);
    }
    return item;
};

/**
 * class represents a Cosmos Database
 */
export class CosmosDatabase {
    private client: CosmosClient;
    private database: Database;
    private collectionMap: Map<string, Container> = new Map();

    constructor(client: CosmosClient, database: Database) {
        this.client = client;
        this.database = database;
    }

    /**
     * Create a collection if not exists
     * @param coll
     */
    public async createCollection(coll: string): Promise<Container> {
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
    public async getCollection(coll: string): Promise<Container> {
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
        const container = await this.getCollection(coll);

        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });

        const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            container.items.create(_data),
        );
        assertIsDefined(resource, `item, coll:${coll}, data:${data}, partition:${partition}`);
        console.info(`created. coll:${coll}, resource:${resource.id}, partition:${partition}`);

        return removeUnusedProps(resource);
    }

    /**
     * Read an item. Throw DocumentClientException(404 NotFound) if object not exist. Can be override be setting the defaultValue.
     *
     * @param coll
     * @param id
     * @param partition
     * @param defaultValue defaultValue if item not exist
     */
    public async read(
        coll: string,
        id: string,
        partition: string = coll,
        defaultValue: CosmosDocument | undefined = undefined,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);

        const item = container.item(id, partition);
        try {
            const itemResponse = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
                item.read<CosmosDocument>(),
            );

            const { statusCode, resource } = itemResponse;

            if (statusCode === 404) {
                throw new CosmosError(itemResponse);
            }

            assertIsDefined(resource);

            return resource;
        } catch (e) {
            if (e.code === 404 && defaultValue !== undefined) {
                return defaultValue;
            } else {
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
    public async upsert(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);
        assertIsDefined(data.id, "data.id");

        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });

        const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            container.items.upsert(_data),
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
        const container = await this.getCollection(coll);

        assertIsDefined(data.id, "data.id");
        const item = container.item(data.id, partition);
        const { resource: toUpdate } = await item.read<CosmosDocument>();
        assertIsDefined(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
        Object.assign(toUpdate, data);

        const { resource: updated } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            item.replace(toUpdate),
        );
        assertIsDefined(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
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
    public async delete(coll: string, id: string, partition: string = coll): Promise<CosmosId> {
        const container = await this.getCollection(coll);

        const item = container.item(id, partition);

        try {
            await executeWithRetry<ItemResponse<ItemDefinition>>(() => item.delete());
            console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
            return { id };
        } catch (e) {
            if (e.code === 404) {
                return undefined;
            } else {
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
    public async find(
        coll: string,
        condition: Condition,
        partition?: string,
    ): Promise<CosmosDocument[]> {
        const container = await this.getCollection(coll);

        const partitionKey = partition || coll;

        //TODO support cross partition query
        const options: FeedOptions = { partitionKey };

        const querySpec = toQuerySpec(condition);

        const iter = await executeWithRetry<QueryIterator<CosmosDocument>>(async () =>
            container.items.query(querySpec, options),
        );

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
    public async count(coll: string, condition: Condition, partition?: string): Promise<number> {
        const container = await this.getCollection(coll);

        const partitionKey = partition || coll;

        //TODO support cross partition query
        const options: FeedOptions = { partitionKey };

        const querySpec = toQuerySpec(condition, true);

        const iter = await executeWithRetry<QueryIterator<CosmosDocument>>(async () =>
            container.items.query(querySpec, options),
        );

        const res = await executeWithRetry<FeedResponse<CosmosDocument>>(async () =>
            iter.fetchNext(),
        );

        const [{ $1: total }] = res.resources;

        return total;
    }
}
