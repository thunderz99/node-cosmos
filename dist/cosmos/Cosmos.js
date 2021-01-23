"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosDatabase = exports.Cosmos = exports.CosmosError = void 0;
const cosmos_1 = require("@azure/cosmos");
const assert_1 = require("../util/assert");
const assert_2 = __importDefault(require("assert"));
const wait_1 = require("../util/wait");
// eslint-disable-next-line @typescript-eslint/no-empty-interface
class CosmosError {
    constructor(init) {
        this.name = "CosmosError";
        Object.assign(this, init);
        this.message = init.message || "";
    }
}
exports.CosmosError = CosmosError;
const _partition = "_partition"; // Partition KeyName
const split = (connectionString) => {
    const parts = /AccountEndpoint=(.+);AccountKey=(.+);/.exec(connectionString);
    assert_2.default(parts, `connectionString should contain AccountEndpoint and AccountKey: ${connectionString}`);
    const [_, endpoint, key] = parts;
    return { endpoint, key };
};
const flatten = (obj, result = {}, keys = []) => {
    Object.keys(obj).forEach((k) => {
        keys.push(k);
        if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            flatten(obj[k], result, keys);
        }
        else if (obj[k] !== undefined) {
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
class Cosmos {
    constructor(connectionString) {
        this.databaseMap = new Map();
        assert_1.assertIsDefined(connectionString, "connectionString");
        const { endpoint, key } = split(connectionString);
        assert_1.assertNotEmpty(endpoint);
        assert_1.assertNotEmpty(key);
        this.client = new cosmos_1.CosmosClient({ endpoint, key });
        console.info(`cosmos endpoint: ${endpoint}`);
        console.info(`cosmos key: ${key.substring(0, 3)}...`);
    }
    async getDatabase(db) {
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
    async deleteDatabase(db) {
        this.databaseMap.delete(db);
        await this.client.database(db).delete();
    }
}
exports.Cosmos = Cosmos;
// eslint-disable-next-line @typescript-eslint/ban-types
async function executeWithRetry(f) {
    const maxRetries = 10;
    let i = 0;
    while (true) {
        try {
            i++;
            return await f();
        }
        catch (e) {
            if (e.code === 429) {
                if (i > maxRetries) {
                    throw e;
                }
                console.log(`[INFO] 429 Too Many Requests. Wait:${e.retryAfterInMilliseconds}`);
                const wait = e.retryAfterInMilliseconds || 1000;
                await wait_1.sleep(wait);
            }
            else {
                throw e;
            }
        }
    }
}
const removeUnusedProps = (item) => {
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
const wrap = (k) => k
    .split(".")
    .map((i) => `["${i}"]`)
    .join("");
const doquery = async (container, select, query, param, partitionKey, sort, offset, limit) => {
    const order = sort && sort.length
        ? " ORDER BY " + sort.map((s) => `r${wrap(s[0])} ${s[1]}`).join(", ")
        : "";
    // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-sql-query#OffsetLimitClause
    const OFFSET = offset !== undefined ? ` OFFSET ${offset}` : " OFFSET 0";
    const LIMIT = limit !== undefined ? ` LIMIT ${limit}` : "";
    const querySpec = {
        query: [`SELECT  ${select} FROM root r`, query.join(" AND ")]
            .filter((s) => s)
            .join(" WHERE ") +
            order +
            OFFSET +
            LIMIT,
        parameters: param,
    };
    console.info("querySpec:", querySpec);
    const options = { partitionKey };
    const iter = await executeWithRetry(() => container.items.query(querySpec, options));
    return iter;
};
/**
 * class represents a Cosmos Database
 */
class CosmosDatabase {
    constructor(client, database) {
        this.collectionMap = new Map();
        this.client = client;
        this.database = database;
    }
    /**
     * Create a collection if not exists
     * @param coll
     */
    async createCollection(coll) {
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
    async getCollection(coll) {
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
    async create(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const { resource } = await executeWithRetry(() => container.items.create(_data));
        assert_1.assertIsDefined(resource, `item, coll:${coll}, data:${data}, partition:${partition}`);
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
    async read(coll, id, partition = coll, defaultValue = undefined) {
        const container = await this.getCollection(coll);
        const item = container.item(id, partition);
        try {
            const itemResponse = await executeWithRetry(() => item.read());
            const { statusCode, resource } = itemResponse;
            if (statusCode === 404) {
                throw new CosmosError(itemResponse);
            }
            assert_1.assertIsDefined(resource);
            return resource;
        }
        catch (e) {
            if (e.code === 404 && defaultValue !== undefined) {
                return defaultValue;
            }
            else {
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
    async upsert(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        assert_1.assertIsDefined(data.id, "data.id");
        const _data = {};
        Object.assign(_data, data);
        Object.assign(_data, { [_partition]: partition });
        const { resource } = await executeWithRetry(() => container.items.upsert(_data));
        assert_1.assertIsDefined(resource, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
        console.info(`upserted. coll:${coll}, id:${data.id}, partition:${partition}`);
        return removeUnusedProps(resource);
    }
    /**
     * Update an item. Supports partial update. Error will be throw if not exist.
     * @param coll
     * @param data
     * @param partition
     */
    async update(coll, data, partition = coll) {
        const container = await this.getCollection(coll);
        assert_1.assertIsDefined(data.id, "data.id");
        const item = container.item(data.id, partition);
        const { resource: toUpdate } = await item.read();
        assert_1.assertIsDefined(toUpdate, `toUpdate, ${coll}, ${data.id}, ${partition}`);
        Object.assign(toUpdate, data);
        const { resource: updated } = await executeWithRetry(() => item.replace(toUpdate));
        assert_1.assertIsDefined(updated, `item, coll:${coll}, id:${data.id}, partition:${partition}`);
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
    async delete(coll, id, partition = coll) {
        const container = await this.getCollection(coll);
        const item = container.item(id, partition);
        try {
            await executeWithRetry(() => item.delete());
            console.info(`deleted coll:${coll}, id:${id}, partition:${partition}`);
            return { id };
        }
        catch (e) {
            if (e.code === 404) {
                return undefined;
            }
            else {
                throw e;
            }
        }
    }
    async find(coll, { filter: _filter, sort = [], offset, limit }, partition) {
        const container = await this.getCollection(coll);
        const filter = flatten(_filter);
        const query = [];
        const param = [];
        const partitionKey = partition || filter[_partition] || coll;
        delete filter[_partition];
        Object.keys(filter).forEach((k) => {
            const p = `@${k.replace(/[$.%]/g, "_")}`;
            let _k = k
                .split(".")
                .reduce((r, f) => {
                r.push(wrap(f));
                return r;
            }, ["r"])
                .join("");
            if (Array.isArray(filter[k])) {
                // ex. filter: '{"id":["ID001", "ID002"]}'
                query.push(`ARRAY_CONTAINS(${p}, ${_k})`);
            }
            else {
                if (0 < _k.indexOf('%"')) {
                    _k = _k.replace('%"', '"');
                    query.push(`STARTSWITH(${_k}, ${p})`);
                }
                else {
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
exports.CosmosDatabase = CosmosDatabase;
//# sourceMappingURL=Cosmos.js.map