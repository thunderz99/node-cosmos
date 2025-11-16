import { PostgresPoolFactory } from "./impl/postgresql/PostgresImpl";
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
    /**
     * Constant for dbType: postgres
     */
    static readonly POSTGRES = "postgres";
    private dbType;
    private connectionString;
    private postgresPoolFactory;
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
     * Normalizes the host part of a connection string so Node resolves localhost consistently.
     */
    static normalizeConnectionString(connectionString: string | undefined): string | undefined;
    /**
     * Transforms non-standard postgres connection strings (jdbc/postgresql schemes) into
     * the canonical postgres:// format so downstream URL parsing behaves consistently.
     */
    private static normalizePostgresVariants;
    /**
     * Moves credentials encoded as search parameters (user/password) into the URL's
     * username/password fields, mirroring how postgres connection strings are typically formatted.
     */
    private static applySearchParamsToUserInfo;
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
     * Specify a custom Pool factory for postgresql. Useful for tests.
     *
     * @param factory
     * @returns cosmosBuilder
     */
    withPostgresPoolFactory(factory: PostgresPoolFactory | undefined): this;
    /**
     * Build the instance representing a Cosmos instance.
     *
     * @return Cosmos instance
     */
    build(): Cosmos;
    /**
     * Returns the connection string appropriate for the configured database type.
     * Normalization (like postgres variant handling) is only applied for Postgres URLs.
     */
    private resolveConnectionString;
}
//# sourceMappingURL=CosmosBuilder.d.ts.map