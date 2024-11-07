import { Db } from "mongodb";
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
export declare class MongoImpl implements Cosmos {
    /**
     * native client instance to be hold in memory
     */
    private readonly client;
    /**
     * A cache of <dbName, CosmosDatabase instance>, in order to get the instance quickly
     */
    private readonly databaseMap;
    /**
     * Whether to auto generate _expireAtEnabled json field is ttl field is present. Used for compatibility for CosmosDB
     *
     */
    private expireAtEnabled;
    /**
     * Whether to auto generate _etag json field when created/updated. Used for compatibility for CosmosDB
     */
    private etagEnabled;
    /**
     * A flag in memory to represent whether the native mongo client is connected to mongodb
     */
    private connected;
    constructor(connectionString: string | undefined, expireAtEnabled?: boolean, etagEnabled?: boolean);
    getDatabase(db: string): Promise<CosmosDatabase>;
    deleteDatabase(db: string): Promise<void>;
    createDatabaseIfNotExist(dbName: string): Promise<Db>;
}
//# sourceMappingURL=MongoImpl.d.ts.map