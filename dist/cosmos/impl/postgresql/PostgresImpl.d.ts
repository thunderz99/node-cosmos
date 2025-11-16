import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
import { Pool } from "pg";
/** Allows callers to customize how pg Pools are created. */
export type PostgresPoolFactory = (connectionString: string) => Pool;
/**
 * Concrete Cosmos driver backed by PostgreSQL.
 * Manages one pg Pool and lazily creates PostgresDatabaseImpl instances.
 */
export declare class PostgresImpl implements Cosmos {
    /** Shared pg Pool used across databases. */
    private readonly pool;
    /** Local cache of database handles keyed by name. */
    private readonly databaseMap;
    /**
     * @param connectionString PostgreSQL connection string.
     * @param poolFactory Optional factory for dependency injection.
     */
    constructor(connectionString: string | undefined, poolFactory?: PostgresPoolFactory);
    /** Returns a cached or newly created PostgresDatabaseImpl. */
    getDatabase(db: string): Promise<CosmosDatabase>;
    /** Removes cached database handles. */
    deleteDatabase(db: string): Promise<void>;
    /** Closes the pg Pool and underlying connections. */
    close(): Promise<void>;
}
//# sourceMappingURL=PostgresImpl.d.ts.map