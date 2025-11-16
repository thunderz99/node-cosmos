import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
import { PostgresDatabaseImpl } from "./PostgresDatabaseImpl";
import { Pool } from "pg";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";

export type PostgresPoolFactory = (connectionString: string) => Pool;

const defaultPoolFactory: PostgresPoolFactory = (connectionString: string) => {
    return new Pool({ connectionString });
};

export class PostgresImpl implements Cosmos {
    private readonly pool: Pool;
    private readonly databaseMap: Map<string, CosmosDatabase> = new Map();

    constructor(connectionString: string | undefined, poolFactory?: PostgresPoolFactory) {
        assertIsDefined(connectionString, "connectionString");
        assertNotEmpty(connectionString, "connectionString");
        const factory = poolFactory || defaultPoolFactory;
        this.pool = factory(connectionString);
    }

    public async getDatabase(db: string): Promise<CosmosDatabase> {
        const database = this.databaseMap.get(db);
        if (database) {
            return database;
        }

        const newDatabase = new PostgresDatabaseImpl(this.pool, db);
        this.databaseMap.set(db, newDatabase);
        return newDatabase;
    }

    public async deleteDatabase(db: string): Promise<void> {
        this.databaseMap.delete(db);
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }
}
