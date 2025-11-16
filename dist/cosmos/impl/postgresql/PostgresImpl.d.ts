import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
import { Pool } from "pg";
export type PostgresPoolFactory = (connectionString: string) => Pool;
export declare class PostgresImpl implements Cosmos {
    private readonly pool;
    private readonly databaseMap;
    constructor(connectionString: string | undefined, poolFactory?: PostgresPoolFactory);
    getDatabase(db: string): Promise<CosmosDatabase>;
    deleteDatabase(db: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=PostgresImpl.d.ts.map