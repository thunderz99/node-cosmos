import { Condition } from "../../condition/Condition";
import { CosmosDatabase, CosmosDocument, CosmosId } from "../../CosmosDatabase";
import { CosmosContainer } from "../../CosmosContainer";
import { Pool } from "pg";
/**
 * CosmosDatabase implementation that stores JSON documents inside
 * PostgreSQL tables and partitions them by schema/table mapping.
 */
export declare class PostgresDatabaseImpl implements CosmosDatabase {
    /** Shared pg Pool reused for each container. */
    private readonly pool;
    /** Database name provided by the Cosmos API. */
    private readonly dbName;
    /** Cached CosmosContainers keyed by logical collection name. */
    private readonly collectionMap;
    /**
     * @param pool pg Pool used for queries.
     * @param dbName Logical database name, used to scope containers.
     */
    constructor(pool: Pool, dbName: string);
    /** Lazily creates a CosmosContainer for a collection. */
    createCollection(coll: string): Promise<CosmosContainer>;
    /** Removes cached metadata for a collection. */
    deleteCollection(coll: string): Promise<void>;
    /** Gets or creates the CosmosContainer for the provided collection. */
    getCollection(coll: string): Promise<CosmosContainer>;
    /** Inserts a new document into `<schema>.<partition>` jsonb table. */
    create(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /** Reads a document and throws 404 when not found. */
    read(coll: string, id: string, partition?: string): Promise<CosmosDocument>;
    /** Reads a document and falls back to default when missing. */
    readOrDefault(coll: string, id: string, partition: string, defaultValue: CosmosDocument | null): Promise<CosmosDocument | null>;
    /** Inserts or replaces a document by id. */
    upsert(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /** Updates an existing document and merges payload with stored value. */
    update(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    /** Deletes a document by id and returns the CosmosId when successful. */
    delete(coll: string, id: string, partition?: string): Promise<CosmosId>;
    /** Finds documents by translating a Condition into SQL. */
    find(coll: string, condition: Condition, partition?: string): Promise<CosmosDocument[]>;
    /** Not implemented helper, kept for Cosmos interface compatibility. */
    findBySQL(coll: string, query: string, partition?: string): Promise<CosmosDocument[]>;
    /** Counts documents matching the provided Condition. */
    count(coll: string, condition: Condition, partition?: string): Promise<number>;
    /** Extracts the first row data or throws CosmosError when empty. */
    private extractResource;
}
//# sourceMappingURL=PostgresDatabaseImpl.d.ts.map