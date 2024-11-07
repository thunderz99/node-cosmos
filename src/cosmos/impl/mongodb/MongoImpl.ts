import { Db, MongoClient } from "mongodb";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";

import { Cosmos } from "../../Cosmos";
import { CosmosDatabase } from "../../CosmosDatabase";
import { MongoDatabaseImpl } from "./MongoDatabaseImpl";

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
export class MongoImpl implements Cosmos {
    /**
     * native client instance to be hold in memory
     */
    private readonly client: MongoClient;

    /**
     * A cache of <dbName, CosmosDatabase instance>, in order to get the instance quickly
     */
    private readonly databaseMap: Map<string, CosmosDatabase> = new Map();

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
     * A flag in memory to represent whether the native mongo client is connected to mongodb
     */
    private connected = false;

    constructor(
        connectionString: string | undefined,
        expireAtEnabled = false,
        etagEnabled = false,
    ) {
        assertIsDefined(connectionString, "connectionString");
        assertNotEmpty(connectionString, "connectionString");

        this.client = new MongoClient(connectionString);
        this.expireAtEnabled = expireAtEnabled;
        this.etagEnabled = etagEnabled;
    }

    public async getDatabase(db: string): Promise<CosmosDatabase> {
        const { client, databaseMap } = this;

        const database = databaseMap.get(db);
        if (database) {
            return database;
        }

        if (!this.connected) {
            await this.client.connect();
            this.connected = true;
            console.info("mongo client connected");
        }

        const dbResource = await this.createDatabaseIfNotExist(db);
        const newDatabase = new MongoDatabaseImpl(client, dbResource);

        const ret = (newDatabase as unknown) as CosmosDatabase;
        databaseMap.set(db, ret);
        return ret;
    }

    public async deleteDatabase(db: string): Promise<void> {
        this.databaseMap.delete(db);
        await this.client.db(db).dropDatabase();
    }

    public async createDatabaseIfNotExist(dbName: string): Promise<Db> {
        // get db list
        const databases = await this.client.db().admin().listDatabases();

        const dbExists = databases.databases.some((db: { name: string }) => db.name === dbName);

        if (dbExists) {
            return this.client.db(dbName);
        }

        // if not exist, create the db by creating a collection
        console.log(`Database "${dbName}" does not exist. Creating...`);
        const db = this.client.db(dbName);
        const collectionName = "PING";
        await db.createCollection(collectionName);
        console.info(`Database "${dbName}" created with collection "${collectionName}".`);

        return db;
    }
}
