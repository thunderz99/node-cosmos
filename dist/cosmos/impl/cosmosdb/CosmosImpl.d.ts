import { Cosmos } from "../../Cosmos";
import { CosmosClient } from "@azure/cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
/**
 * class that represent a cosmos account
 *
 * Usage:
 * const cosmos = new CosmosImpl("AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx==;")
 * const db = cosmos.getDatabase("Database1")
 *
 * //Then use db to do CRUD / query
 * db.upsert("Users", user)
 *
 */
export declare class CosmosImpl implements Cosmos {
    readonly client: CosmosClient;
    private readonly databaseMap;
    constructor(connectionString: string | undefined);
    getDatabase(db: string): Promise<CosmosDatabase>;
    deleteDatabase(db: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=CosmosImpl.d.ts.map