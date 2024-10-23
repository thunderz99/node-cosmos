import { Condition } from "../../condition/Condition";
import { Container, CosmosClient, Database, ErrorResponse, ItemDefinition } from "@azure/cosmos";
export declare type CosmosDocument = ItemDefinition;
export declare type CosmosId = {
    id: string;
} | undefined;
export declare class CosmosError implements ErrorResponse {
    name: string;
    message: string;
    code: number;
    constructor(errorResponse: Partial<ErrorResponse>);
}
/**
 * class represents a Cosmos Database
 */
export declare class CosmosDatabaseImpl {
    private readonly client;
    private readonly database;
    private readonly collectionMap;
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
}
//# sourceMappingURL=CosmosDatabaseImpl.d.ts.map