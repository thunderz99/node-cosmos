import { Cosmos } from "./Cosmos";
/**
 * Builder class to build a cosmos instance (for azure cosmosdb or mongodb)
 */
export declare class CosmosBuilder {
    /**
     * Constant for dbType: cosmosdb
     */
    static readonly COSMOSDB = "cosmosdb";
    /**
     * Constant for dbType: mongodb
     */
    static readonly MONGODB = "mongodb";
    private dbType;
    private connectionString;
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
     * Specify the dbType( "cosmosdb" or "mongodb" )
     *
     * @param dbType
     * @return cosmosBuilder
     */
    withDatabaseType(dbType: string | undefined): this;
    /**
     * Specify the connectionString for cosmosdb or mongodb
     *
     * @param connectionString
     * @return cosmosBuilder
     */
    withConnectionString(connectionString: string | undefined): this;
    /**
     * Specify whether to enable the expireAt feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withExpireAtEnabled(enabled: boolean): this;
    /**
     * Specify whether to enable the etag feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withEtagEnabled(enabled: boolean): this;
    /**
     * Build the instance representing a Cosmos instance.
     *
     * @return Cosmos instance
     */
    build(): Cosmos;
}
//# sourceMappingURL=CosmosBuilder.d.ts.map