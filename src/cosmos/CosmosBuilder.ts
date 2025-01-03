import { Cosmos } from "./Cosmos";
import { CosmosImpl } from "./impl/cosmosdb/CosmosImpl";
import { MongoImpl } from "./impl/mongodb/MongoImpl";
import assert from "assert";

/**
 * Builder class to build a cosmos instance (for azure cosmosdb or mongodb)
 */
export class CosmosBuilder {
    /**
     * Constant for dbType: cosmosdb
     */
    public static readonly COSMOSDB = "cosmosdb";

    /**
     * Constant for dbType: mongodb
     */
    public static readonly MONGODB = "mongodb";

    private dbType: string = CosmosBuilder.COSMOSDB;
    private connectionString: string | undefined;

    /**
     * Whether to auto generate _expireAtEnabled json field is ttl field is present. Used for compatibility for CosmosDB
     *
     */
    private expireAtEnabled = false;

    /**
     * Whether to auto generate _etag json field when created/updated. Used for compatibility for CosmosDB
     */
    private etagEnabled = false;

    /**
     * Specify the dbType( "cosmosdb" or "mongodb" )
     *
     * @param dbType
     * @return cosmosBuilder
     */
    withDatabaseType(dbType: string | undefined): this {
        this.dbType = dbType || CosmosBuilder.COSMOSDB;
        return this;
    }

    /**
     * Specify the connectionString for cosmosdb or mongodb
     *
     * @param connectionString
     * @return cosmosBuilder
     */
    withConnectionString(connectionString: string | undefined): this {
        this.connectionString = connectionString;
        return this;
    }

    /**
     * Specify whether to enable the expireAt feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withExpireAtEnabled(enabled: boolean): this {
        this.expireAtEnabled = enabled;
        return this;
    }

    /**
     * Specify whether to enable the etag feature for mongodb. No effect on cosmosdb.
     *
     * @param enabled
     * @return cosmosBuilder
     */
    withEtagEnabled(enabled: boolean): this {
        // the etag feature in mongo is not implemented yet
        this.etagEnabled = enabled;
        return this;
    }

    /**
     * Build the instance representing a Cosmos instance.
     *
     * @return Cosmos instance
     */
    build(): Cosmos {
        assert(this.dbType, `dbType should not be empty: ${this.dbType}`);
        assert(
            this.connectionString,
            `connectionString should not be empty ${this.connectionString}`,
        );

        if (this.dbType === CosmosBuilder.COSMOSDB) {
            return new CosmosImpl(this.connectionString);
        }

        if (this.dbType === CosmosBuilder.MONGODB) {
            return new MongoImpl(
                this.connectionString || "",
                this.expireAtEnabled,
                this.etagEnabled,
            );
        }

        throw new Error(`Not supported dbType: ${this.dbType}`);
    }
}
