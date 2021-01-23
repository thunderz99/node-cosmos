import {
    Container,
    ContainerDefinition,
    ContainerResponse,
    CosmosClient,
    Database,
    ErrorResponse,
    ItemDefinition,
    ItemResponse,
    QueryIterator,
    Resource,
    Response,
} from "@azure/cosmos";
import { assertIsDefined, assertNotEmpty } from "../util/assert";

import assert from "assert";
import { sleep } from "../util/wait";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CosmosDocument extends ItemDefinition {}

export type CosmosId =
    | {
          id: string;
      }
    | undefined;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export class CosmosError implements ErrorResponse {
    name = "CosmosError";
    message: string;

    constructor(init: Partial<ErrorResponse>) {
        Object.assign(this, init);
        this.message = init.message || "";
    }
}

export type Json = null | boolean | number | string | Array<any> | Record<string, unknown>;

export interface Condition {
    filter?: Json;
    sort?: [string, string][];
    offset?: number;
    limit?: number;
}

export interface FindResult {
    iter: QueryIterator<any>;
    items: any[];
    total?: number;
}

const _partition = "_partition"; // Partition KeyName

const split = (connectionString: string) => {
    const parts = /AccountEndpoint=(.+);AccountKey=(.+);/.exec(connectionString);

    assert(
        parts,
        `connectionString should contain AccountEndpoint and AccountKey: ${connectionString}`,
    );

    const [_, endpoint, key] = parts;
    return { endpoint, key };
};

const flatten = (obj: any, result: any = {}, keys: string[] = []) => {
    Object.keys(obj).forEach((k) => {
        keys.push(k);
        if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            flatten(obj[k], result, keys);
        } else if (obj[k] !== undefined) {
            result[keys.join(".")] = obj[k];
        }
        keys.pop();
    });
    return result;
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

// eslint-disable-next-line @typescript-eslint/ban-types
async function executeWithRetry<T>(f: Function): Promise<T> {
    const maxRetries = 10;
    let i = 0;
    while (true) {
        try {
            i++;
            return await f();
        } catch (e) {
            if (e.code === 429) {
                if (i > maxRetries) {
                    throw e;
                }
                console.log(`[INFO] 429 Too Many Requests. Wait:${e.retryAfterInMilliseconds}`);
                const wait = e.retryAfterInMilliseconds || 1000;
                await sleep(wait);
            } else {
                throw e;
            }
        }
    }
}

const removeUnusedProps = (item: CosmosDocument) => {
    if (item) {
        Object.keys(item)
            .filter((k) => k.startsWith("_") && k !== "_ts" && k !== _partition && k !== "_etag")
            .forEach((k) => delete item[k]);
    }
    return item;
};

/**
 * Convert to use reserved words. e.g: r.group -> r["group"]
 */
const wrap = (k: string) =>
    k
        .split(".")
        .map((i) => `["${i}"]`)
        .join("");

const doquery = async (
    container: any,
    select: string,
    query: string[],
    param: any[],
    partitionKey: string,
    sort?: [string, string][],
    offset?: number,
    limit?: number,
) => {
    const order =
        sort && sort.length
            ? " ORDER BY " + sort.map((s) => `r${wrap(s[0])} ${s[1]}`).join(", ")
            : "";

    // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-sql-query#OffsetLimitClause
    const OFFSET = offset !== undefined ? ` OFFSET ${offset}` : " OFFSET 0";
    const LIMIT = limit !== undefined ? ` LIMIT ${limit}` : "";

    const querySpec = {
        query:
            [`SELECT  ${select} FROM root r`, query.join(" AND ")]
                .filter((s) => s)
                .join(" WHERE ") +
            order +
            OFFSET +
            LIMIT,
        parameters: param,
    };

    console.info("querySpec:", querySpec);

    const options = { partitionKey };

    const iter = await executeWithRetry<QueryIterator<any>>(() =>
        container.items.query(querySpec, options),
    );

    return iter;
};

/**
 * class represents a Cosmos Database
 */
export class CosmosDatabase {
    private client: CosmosClient;
    private database: Database;
    private collectionMap: Map<string, Container> = new Map();

    constructor(client: CosmosClient, database: Database) {
        this.client = client;
        this.database = database;
    }

    /**
     * Create a collection if not exists
     * @param coll
     */
    async createCollection(coll: string): Promise<Container> {
        const { database } = this;
        const partitionKey = "/" + _partition;
        const conf = { id: coll, partitionKey, defaultTtl: -1 };
        const { container } = await database.containers.createIfNotExists(conf);
        return container;
    }

    /**
     *
     * @param coll
     */
    protected async getCollection(coll: string): Promise<Container> {
        const { collectionMap } = this;
        let collection = collectionMap.get(coll);
        if (!collection) {
            collection = await this.createCollection(coll);
            collectionMap.set(coll, collection);
        }
        return collection;
    }

    /**
     * Create an item.
     * @param coll
     * @param data
     * @param partition
     */
    async create(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);

        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });

        const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            container.items.create(_data),
        );
        assertIsDefined(resource, `item, coll:${coll}, data:${data}, partition:${partition}`);
        console.info(`created. coll:${coll}, resource:${resource.id}, partition:${partition}`);

        return removeUnusedProps(resource);
    }

    /**
     * Read an item. Throw DocumentClientException(404 NotFound) if object not exist. Can be override be setting the defaultValue.
     *
     * @param coll
     * @param id
     * @param partition
     * @param defaultValue defaultValue if item not exist
     */
    async read(
        coll: string,
        id: string,
        partition: string = coll,
        defaultValue: CosmosDocument | undefined = undefined,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);

        const item = container.item(id, partition);
        try {
            const itemResponse = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
                item.read<CosmosDocument>(),
            );

            const { statusCode, resource } = itemResponse;

            if (statusCode === 404) {
                throw new CosmosError(itemResponse);
            }

            assertIsDefined(resource);

            return resource;
        } catch (e) {
            if (e.code === 404 && defaultValue !== undefined) {
                return defaultValue;
            } else {
                throw e;
            }
        }
    }

    /**
     * Upsert an item. Insert will be performed if not exist. Do not support partial update.
     * @param coll
     * @param data
     * @param partition
     */
    async upsert(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);
        assertIsDefined(data.id, "data.id");

        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });

        const { resource } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            container.items.upsert(_data),
        );
        assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }

    /**
     * Update an item. Supports partial update. Error will be throw if not exist.
     * @param coll
     * @param data
     * @param partition
     */
    async update(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        const container = await this.getCollection(coll);

        assertIsDefined(data.id, "data.id");
        const item = container.item(data.id, partition);
        const { resource: toUpdate } = await item.read<CosmosDocument>();
        assertIsDefined(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
        Object.assign(toUpdate, data);

        const { resource: updated } = await executeWithRetry<ItemResponse<CosmosDocument>>(() =>
            item.replace(toUpdate),
        );
        assertIsDefined(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`updated. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(updated);
    }

    /**
     * Delete an item. Return {id} if exist. Otherwise return undefined.
     *
     * @param coll
     * @param id
     * @param partition
     */
    async delete(coll: string, id: string, partition: string = coll): Promise<CosmosId> {
        const container = await this.getCollection(coll);

        const item = container.item(id, partition);

        try {
            await executeWithRetry<ItemResponse<ItemDefinition>>(() => item.delete());
            console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
            return { id };
        } catch (e) {
            if (e.code === 404) {
                return undefined;
            } else {
                throw e;
            }
        }
    }

    async find(
        coll: string,
        { filter: _filter, sort = [], offset, limit }: Condition,
        partition?: string,
    ): Promise<FindResult> {
        const container = await this.getCollection(coll);

        const filter = flatten(_filter);
        const query: string[] = [];
        const param: { name: string; value: string }[] = [];
        const partitionKey = partition || filter[_partition] || coll;
        delete filter[_partition];

        Object.keys(filter).forEach((k) => {
            const p = `@${k.replace(/[$.%]/g, "_")}`;

            let _k = k
                .split(".")
                .reduce(
                    (r, f) => {
                        r.push(wrap(f));
                        return r;
                    },
                    ["r"],
                )
                .join("");

            if (Array.isArray(filter[k])) {
                // ex. filter: '{"id":["ID001", "ID002"]}'
                query.push(`ARRAY_CONTAINS(${p}, ${_k})`);
            } else {
                if (0 < _k.indexOf('%"')) {
                    _k = _k.replace('%"', '"');
                    query.push(`STARTSWITH(${_k}, ${p})`);
                } else {
                    query.push(`${_k} = ${p}`);
                }
            }
            param.push({ name: p, value: filter[k] });
        });

        //default limit is 100 to protect db
        limit = limit || 100;
        const iter = await doquery(container, `*`, query, param, partitionKey, sort, offset, limit);
        const response = await iter.fetchAll();
        return { iter, items: response.resources };
    }
}
