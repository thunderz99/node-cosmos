import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
/**
 * class that represent a cosmos account
 *
 * Usage:
 * const cosmos = new Cosmos("AccountEndpoint=https://xxx.documents.azure.com:443/;AccountKey=xxx==;")
 * const db = cosmos.getDatabase("Database1")
 *
 * //Then use db to do CRUD / query
 * db.upsert("Users", user)
 *
 */
export declare class CosmosImpl implements Cosmos {
    private readonly client;
    private readonly databaseMap;
    constructor(connectionString: string | undefined);
    getDatabase(db: string): Promise<CosmosDatabase>;
    deleteDatabase(db: string): Promise<void>;
}
//# sourceMappingURL=CosmosImpl.d.ts.map