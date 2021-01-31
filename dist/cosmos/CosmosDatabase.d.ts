import { Condition } from "./condition/Condition";
import { Container, CosmosClient, Database, ErrorResponse, ItemDefinition } from "@azure/cosmos";
export declare type CosmosDocument = ItemDefinition;
export declare type CosmosId = {
    id: string;
} | undefined;
export declare class CosmosError implements ErrorResponse {
    name: string;
    message: string;
    constructor(init: Partial<ErrorResponse>);
}
/**
 * class represents a Cosmos Database
 */
export declare class CosmosDatabase {
    private client;
    private database;
    private collectionMap;
    constructor(client: CosmosClient, database: Database);
    /**
     * Create a collection if not exists
     * @param coll
     */
    createCollection(coll: string): Promise<Container>;
    /**
     *
     * @param coll
     */
    getCollection(coll: string): Promise<Container>;
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
    /**
     * find data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    find(coll: string, condition: Condition, partition?: string): Promise<CosmosDocument[]>;
    /**
     * count data by condition
     *
     * @param coll
     * @param condition
     * @param partition
     */
    count(coll: string, condition: Condition, partition?: string): Promise<number>;
}
