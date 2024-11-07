import { MongoClient } from "mongodb";
import { CosmosDocument } from "../../CosmosDatabase";
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
    private privateGreeting;
}
//# sourceMappingURL=MongoDatabaseImpl.d.ts.map