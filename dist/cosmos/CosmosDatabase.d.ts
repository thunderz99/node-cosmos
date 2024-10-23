import { Container, ErrorResponse, ItemDefinition } from "@azure/cosmos";
import { Condition } from "./condition/Condition";
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
export declare const _partition = "_partition";
/**
 * interface represents a Cosmos/Mongo Database
 */
export interface CosmosDatabase {
    /**
     * Create a collection if it doesn't exist.
     *
     * @param coll - The name of the collection to create.
     * @returns A promise that resolves to the created or existing container.
     */
    createCollection(coll: string): Promise<Container>;
    /**
     * Retrieve a collection from the database, or create it if it doesn't exist.
     *
     * @param coll - The name of the collection to retrieve or create.
     * @returns A promise that resolves to the container.
     */
    getCollection(coll: string): Promise<Container>;
    /**
     * Create a new item in the specified collection.
     *
     * @param coll - The name of the collection where the item will be created.
     * @param data - The document data to be created.
     * @param partition - Optional partition key. Defaults to collection name if not provided.
     * @returns A promise that resolves to the created document.
     */
    create(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Read an item from the specified collection. Throws an error if the item is not found.
     *
     * @param coll - The name of the collection.
     * @param id - The ID of the item to read.
     * @param partition - Optional partition key. Defaults to collection name if not provided.
     * @returns A promise that resolves to the retrieved document.
     */
    read(coll: string, id: string, partition?: string): Promise<CosmosDocument>;
    /**
     * Read an item from the specified collection. Returns a default value if the item is not found.
     *
     * @param coll - The name of the collection.
     * @param id - The ID of the item to read.
     * @param partition - The partition key.
     * @param defaultValue - The default value to return if the item does not exist.
     * @returns A promise that resolves to the document or the default value.
     */
    readOrDefault(coll: string, id: string, partition: string, defaultValue: CosmosDocument | null): Promise<CosmosDocument | null>;
    /**
     * Upsert (update or insert) an item into the specified collection. If the item does not exist, it will be created.
     *
     * @param coll - The name of the collection.
     * @param data - The document data to upsert.
     * @param partition - Optional partition key. Defaults to collection name if not provided.
     * @returns A promise that resolves to the upserted document.
     */
    upsert(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Update an existing item in the specified collection. Throws an error if the item does not exist.
     *
     * @param coll - The name of the collection.
     * @param data - The document data to update.
     * @param partition - Optional partition key. Defaults to collection name if not provided.
     * @returns A promise that resolves to the updated document.
     */
    update(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /**
     * Delete an item from the specified collection. Returns the item's ID if it exists, otherwise returns undefined.
     *
     * @param coll - The name of the collection.
     * @param id - The ID of the item to delete.
     * @param partition - Optional partition key. Defaults to collection name if not provided.
     * @returns A promise that resolves to the ID of the deleted item or undefined if not found.
     */
    delete(coll: string, id: string, partition?: string): Promise<CosmosId>;
    /**
     * Find items in the specified collection that match the provided condition.
     *
     * @param coll - The name of the collection.
     * @param condition - The query condition to apply.
     * @param partition - Optional partition key.
     * @returns A promise that resolves to an array of matching documents.
     */
    find(coll: string, condition: Condition, partition?: string): Promise<CosmosDocument[]>;
    /**
     * Find items in the specified collection using a SQL-like query.
     *
     * @param coll - The name of the collection.
     * @param query - The SQL-like query string.
     * @param partition - Optional partition key.
     * @returns A promise that resolves to an array of matching documents.
     */
    findBySQL(coll: string, query: string, partition?: string): Promise<CosmosDocument[]>;
    /**
     * Count the number of items in the specified collection that match the provided condition.
     *
     * @param coll - The name of the collection.
     * @param condition - The query condition to apply.
     * @param partition - Optional partition key.
     * @returns A promise that resolves to the number of matching documents.
     */
    count(coll: string, condition: Condition, partition?: string): Promise<number>;
}
//# sourceMappingURL=CosmosDatabase.d.ts.map