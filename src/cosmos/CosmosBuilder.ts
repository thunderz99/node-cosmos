import { PostgresImpl, PostgresPoolFactory } from "./impl/postgresql/PostgresImpl";

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

    /**
     * Constant for dbType: postgres
     */
    public static readonly POSTGRES = "postgres";

    private dbType: string = CosmosBuilder.COSMOSDB;
    private connectionString: string | undefined;
    private postgresPoolFactory: PostgresPoolFactory | undefined;

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
        this.connectionString = CosmosBuilder.normalizeConnectionString(connectionString);
        return this;
    }
    /**
     * Normalizes the host part of a connection string so Node resolves localhost consistently.
     */
    public static normalizeConnectionString(
        connectionString: string | undefined,
    ): string | undefined {
        if (!connectionString) {
            return connectionString;
        }
        const normalized = CosmosBuilder.normalizePostgresVariants(connectionString);
        try {
            const url = new URL(normalized);
            CosmosBuilder.applySearchParamsToUserInfo(url);
            if (url.hostname === "localhost") {
                url.hostname = "127.0.0.1";
                url.host = url.port ? `127.0.0.1:${url.port}` : "127.0.0.1";
            }
            return url.toString();
        } catch {
            // ignore and fallback to raw connection string
            return normalized;
        }
    }

    /**
     * Transforms non-standard postgres connection strings (jdbc/postgresql schemes) into
     * the canonical postgres:// format so downstream URL parsing behaves consistently.
     */
    private static normalizePostgresVariants(connectionString: string): string {
        let normalized = connectionString;
        if (normalized.startsWith("jdbc:postgresql://")) {
            normalized = normalized.substring("jdbc:".length);
        }
        if (normalized.startsWith("postgresql://")) {
            normalized = `postgres://${normalized.substring("postgresql://".length)}`;
        }
        return normalized;
    }

    /**
     * Moves credentials encoded as search parameters (user/password) into the URL's
     * username/password fields, mirroring how postgres connection strings are typically formatted.
     */
    private static applySearchParamsToUserInfo(url: URL): void {
        const params = url.searchParams;
        const user = params.get("user");
        const password = params.get("password");
        if (user && !url.username) {
            url.username = user;
        }
        if (password && !url.password) {
            url.password = password;
        }
        if (user) {
            params.delete("user");
        }
        if (password) {
            params.delete("password");
        }
        const serialized = params.toString();
        url.search = serialized ? `?${serialized}` : "";
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
     * Specify a custom Pool factory for postgresql. Useful for tests.
     *
     * @param factory
     * @returns cosmosBuilder
     */
    withPostgresPoolFactory(factory: PostgresPoolFactory | undefined): this {
        this.postgresPoolFactory = factory;
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

        if (this.dbType === CosmosBuilder.POSTGRES) {
            return new PostgresImpl(this.connectionString, this.postgresPoolFactory);
        }

        throw new Error(`Not supported dbType: ${this.dbType}`);
    }
}
