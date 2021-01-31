// eslint-disable-next-line @typescript-eslint/no-empty-interface

import { assertIsDefined, assertNotEmpty } from "../util/assert";

import { CosmosClient } from "@azure/cosmos";
import { CosmosDatabase } from "./CosmosDatabase";
import assert from "assert";

const split = (connectionString: string) => {
    const parts = /AccountEndpoint=(.+);AccountKey=(.+);/.exec(connectionString);

    assert(
        parts,
        `connectionString should contain AccountEndpoint and AccountKey: ${connectionString}`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, endpoint, key] = parts;
    return { endpoint, key };
};

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
export class Cosmos {
    private client: CosmosClient;

    private databaseMap: Map<string, CosmosDatabase> = new Map();

    constructor(connectionString: string | undefined) {
        assertIsDefined(connectionString, "connectionString");
        const { endpoint, key } = split(connectionString);

        assertNotEmpty(endpoint);
        assertNotEmpty(key);
        this.client = new CosmosClient({ endpoint, key });

        console.info(`cosmos endpoint: ${endpoint}`);
        console.info(`cosmos key: ${key.substring(0, 3)}...`);
    }

    async getDatabase(db: string): Promise<CosmosDatabase> {
        const { client, databaseMap } = this;

        const database = databaseMap.get(db);
        if (database) {
            return database;
        }

        const options = {
            offerEnableRUPerMinuteThroughput: true,
            offerThroughput: 400,
        };

        const dbResource = (await client.databases.createIfNotExists({ id: db }, options)).database;
        const newDatabase = new CosmosDatabase(client, dbResource);
        databaseMap.set(db, newDatabase);
        return newDatabase;
    }

    async deleteDatabase(db: string): Promise<void> {
        this.databaseMap.delete(db);
        await this.client.database(db).delete();
    }
}
