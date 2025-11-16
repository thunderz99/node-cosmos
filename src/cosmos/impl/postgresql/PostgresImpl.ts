import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
import { PostgresDatabaseImpl } from "./PostgresDatabaseImpl";
import { Pool } from "pg";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";

/** Allows callers to customize how pg Pools are created. */
export type PostgresPoolFactory = (connectionString: string) => Pool;

/** Default Pool factory that just forwards the connection string. */
const defaultPoolFactory: PostgresPoolFactory = (connectionString: string) => {
    return new Pool({ connectionString });
};

/**
 * Concrete Cosmos driver backed by PostgreSQL.
 * Manages one pg Pool and lazily creates PostgresDatabaseImpl instances.
 */
export class PostgresImpl implements Cosmos {
    /** Shared pg Pool used across databases. */
    private readonly pool: Pool;
    /** Local cache of database handles keyed by name. */
    private readonly databaseMap: Map<string, CosmosDatabase> = new Map();

    /**
     * @param connectionString PostgreSQL connection string.
     * @param poolFactory Optional factory for dependency injection.
     */
    constructor(connectionString: string | undefined, poolFactory?: PostgresPoolFactory) {
        assertIsDefined(connectionString, "connectionString");
        assertNotEmpty(connectionString, "connectionString");
        const factory = poolFactory || defaultPoolFactory;
        this.pool = factory(connectionString);
    }

    /** Returns a cached or newly created PostgresDatabaseImpl. */
    public async getDatabase(db: string): Promise<CosmosDatabase> {
        const database = this.databaseMap.get(db);
        if (database) {
            return database;
        }

        const newDatabase = new PostgresDatabaseImpl(this.pool, db);
        this.databaseMap.set(db, newDatabase);
        return newDatabase;
    }

    /** Removes cached database handles. */
    public async deleteDatabase(db: string): Promise<void> {
        this.databaseMap.delete(db);
    }

    /** Closes the pg Pool and underlying connections. */
    public async close(): Promise<void> {
        await this.pool.end();
    }
}
