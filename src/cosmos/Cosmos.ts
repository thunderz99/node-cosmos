// eslint-disable-next-line @typescript-eslint/no-empty-interface

import { CosmosDatabase } from "./CosmosDatabase";

/**
 * Interface that represents a Cosmos account.
 *
 * Usage example:
 *
 * ```typescript
 * const cosmos: Cosmos = new CosmosImpl("AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx==;");
 * const db = await cosmos.getDatabase("Database1");
 *
 * // Then use db to perform CRUD / query operations
 * await db.upsert("Users", user);
 * ```
 */
export interface Cosmos {
    /**
     * Retrieves or creates a CosmosDatabase instance for the specified database.
     *
     * @param db - The name of the database to retrieve or create.
     * @returns A promise that resolves to the CosmosDatabase instance.
     */
    getDatabase(db: string): Promise<CosmosDatabase>;

    /**
     * Deletes the specified database and removes it from the internal map.
     *
     * @param db - The name of the database to delete.
     * @returns A promise that resolves when the database has been deleted.
     */
    deleteDatabase(db: string): Promise<void>;
}
