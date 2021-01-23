import { Container, CosmosClient, Database, ItemDefinition } from "@azure/cosmos";
export declare type CosmosDocument = ItemDefinition;
export declare type CosmosId = {
    id: string;
} | undefined;
/**
 * class that represent a cosmos account
 *
 * Usage:
 * const cosmos = new Cosmos("AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx==;")
 * const db = cosmos.getDatabase("Database1")
 *
 * //Then use db to do CRUD / query
 * db.upsert("Users", user)
 *
 */
export declare class Cosmos {
    private client;
    private databaseMap;
    constructor(connectionString: string | undefined);
    getDatabase(db: string): Promise<CosmosDatabase>;
    deleteDatabase(db: string): Promise<void>;
}
export declare class CosmosDatabase {
    private client;
    private database;
    private collectionMap;
    constructor(client: CosmosClient, database: Database);
    protected createCollection(coll: string): Promise<Container>;
    protected getCollection(coll: string): Promise<Container>;
    /**
     * Create an item.
     * @param coll
     * @param data
     * @param partition
     */
    create(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Read an item. Throw DocumentClientException(404 NotFound) if object not exist. Can be override be setting the defaultValue.
     *
     * @param coll
     * @param id
     * @param partition
     * @param defaultValue defaultValue if item not exist
     */
    read(coll: string, id: string, partition?: string, defaultValue?: CosmosDocument | undefined): Promise<CosmosDocument>;
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
}
