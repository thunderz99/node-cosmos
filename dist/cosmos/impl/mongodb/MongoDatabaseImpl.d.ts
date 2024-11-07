import { Db, MongoClient } from "mongodb";
import { CosmosContainer } from "../../CosmosContainer";
/**
 * class represents a Cosmos Database
 */
export declare class MongoDatabaseImpl {
    private readonly client;
    private readonly database;
    private readonly collectionMap;
    constructor(client: MongoClient, database: Db);
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
}
//# sourceMappingURL=MongoDatabaseImpl.d.ts.map