import { ErrorResponse, ItemDefinition } from "@azure/cosmos";

import { Condition } from "./condition/Condition";
import { CosmosContainer } from "./CosmosContainer";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CosmosDocument {
    /** The id of the item. User settable property. Uniquely identifies the item along with the partition key */
    id?: string;
    /** Time to live in seconds for collections with TTL enabled */
    ttl?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export type CosmosId =
    | {
          id: string;
      }
    | undefined;

export class CosmosError implements ErrorResponse {
    name = "CosmosError";
    message: string;
    code: number;

    constructor(
        errorResponse?: Partial<ErrorResponse>,
        code: number = errorResponse?.code || errorResponse?.statusCode,
        message: string = errorResponse?.message || "",
    ) {
        if (errorResponse) {
            Object.assign(this, errorResponse);
        }
        this.code = code;
        this.message = message;
    }
}

export const _partition = "_partition"; // Partition KeyName

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
    createCollection(coll: string): Promise<CosmosContainer>;

    /**
     * Delete a collection(If not exist, do nothing).
     *
     * @param coll - The name of the collection to delete.
     * @returns A promise that resolves when the collection has been deleted.
     */
    deleteCollection(coll: string): Promise<void>;

    /**
     * Retrieve a collection from the database, or create it if it doesn't exist.
     *
     * @param coll - The name of the collection to retrieve or create.
     * @returns A promise that resolves to the container.
     */
    getCollection(coll: string): Promise<CosmosContainer>;

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
    readOrDefault(
        coll: string,
        id: string,
        partition: string,
        defaultValue: CosmosDocument | null,
    ): Promise<CosmosDocument | null>;

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
