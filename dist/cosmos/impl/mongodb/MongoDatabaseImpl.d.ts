import { Condition } from "../../condition/Condition";
import { CosmosDocument, CosmosId } from "../../CosmosDatabase";
import { MongoClient } from "mongodb";
import { Cosmos } from "../../Cosmos";
import { CosmosContainer } from "../../CosmosContainer";
/**
 * class represents a Cosmos Database
 */
export declare class MongoDatabaseImpl {
    private readonly client;
    private readonly cosmosAccount;
    private readonly collectionMap;
    constructor(client: MongoClient, cosmosAccount: Cosmos);
    /**
     * Create a collection if not exists
     * @param coll
     */
    createCollection(coll: string): Promise<CosmosContainer>;
    /**
     * Delete a collection if exists
     * @param coll
     */
    deleteCollection(coll: string): Promise<void>;
    /**
     * Get a collection. If not exist, the collection will be created.
     * @param coll
     */
    getCollection(coll: string): Promise<CosmosContainer>;
    /**
     * Create an item.
     * @param coll
     * @param data
     * @param partition
     */
    create(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Read an item. Throw DocumentClientException(404 NotFound) if object not exist
     *
     * @param coll
     * @param id
     * @param partition
     */
    read(coll: string, id: string, partition?: string): Promise<CosmosDocument>;
    /**
     * Read an item. return defaultValue if item not exist
     *
     * @param coll
     * @param id
     * @param partition
     * @param defaultValue defaultValue if item not exist
     */
    readOrDefault(coll: string, id: string, partition: string, defaultValue: CosmosDocument | null): Promise<CosmosDocument | null>;
    /**
     * Upsert an item. Insert will be performed if not exist. Do not support partial update.
     * @param coll
     * @param data
     * @param partition
     */
    upsert(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Update an item. Supports partial update. Error will be throw if not exist.
     * @param coll
     * @param data
     * @param partition
     */
    update(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Delete an item. Return {id} if exist. Otherwise return undefined.
     *
     * @param coll
     * @param id
     * @param partition
     */
    delete(coll: string, id: string, partition?: string): Promise<CosmosId>;
    /**
     * find data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    find(coll: string, condition: Condition, partition?: string): Promise<CosmosDocument[]>;
    /**
     * find data by SQL
     * using SQL-like syntax
     * https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/cosmosdb/cosmos/README.md#query-the-database
     * @param coll
     * @param query
     * @param partition
     */
    findBySQL(coll: string, query: string, partition?: string): Promise<CosmosDocument[]>;
    /**
     * count data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    count(coll: string, condition: Condition, partition?: string): Promise<number>;
    /**
     * Adds an "_expireAt" field automatically if `expireAtEnabled` is true and "ttl" has an integer value.
     *
     * @param _data - An object map representing MongoDB document fields.
     * @return The `expireAt` Date, or `null` if not set.
     */
    _addExpireAt(_data: Record<string, unknown>): Date | null;
}
//# sourceMappingURL=MongoDatabaseImpl.d.ts.map