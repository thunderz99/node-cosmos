"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDatabaseImpl = void 0;
const CosmosDatabase_1 = require("../../CosmosDatabase");
const CosmosContainer_1 = require("../../CosmosContainer");
const PostgresConditionBuilder_1 = require("./PostgresConditionBuilder");
const assert_1 = require("../../../util/assert");
const uuid_1 = require("uuid");
const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
const checkValidId = (id) => {
    if (!id) {
        throw new Error("id cannot be empty");
    }
    if (id.includes("\t") || id.includes("\n") || id.includes("\r")) {
        throw new Error("id cannot contain \t or \n or \r");
    }
};
const addTimestamp = (data) => {
    const epochMillis = Date.now();
    data["_ts"] = epochMillis / 1000;
};
const ensureIdentifier = (value, label) => {
    (0, assert_1.assertNotEmpty)(value, label);
    if (!identifierRegex.test(value)) {
        throw new Error(`${label} contains invalid characters: ${value}`);
    }
};
const qualify = (schema, table) => {
    return `"${schema}"."${table}"`;
};
class PostgresDatabaseImpl {
    constructor(pool, dbName) {
        this.collectionMap = new Map();
        this.pool = pool;
        this.dbName = dbName;
    }
    async createCollection(coll) {
        ensureIdentifier(coll, "coll");
        const container = new CosmosContainer_1.CosmosContainer(coll, { schema: coll });
        this.collectionMap.set(coll, container);
        return container;
    }
    async deleteCollection(coll) {
        this.collectionMap.delete(coll);
    }
    async getCollection(coll) {
        let collection = this.collectionMap.get(coll);
        if (!collection) {
            collection = await this.createCollection(coll);
        }
        return collection;
    }
    async create(coll, data, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const schema = coll;
        const table = partition;
        const fqtn = qualify(schema, table);
        const id = data.id || (0, uuid_1.v4)().toString();
        checkValidId(id);
        const payload = { ...data, id };
        payload[CosmosDatabase_1._partition] = partition;
        addTimestamp(payload);
        const text = `INSERT INTO ${fqtn} (id, data) VALUES ($1, $2::jsonb) RETURNING data`;
        const values = [id, JSON.stringify(payload)];
        const result = await this.pool.query(text, values);
        return this.extractResource(result);
    }
    async read(coll, id, partition = coll) {
        const resource = await this.readOrDefault(coll, id, partition, null);
        if (!resource) {
            throw new CosmosDatabase_1.CosmosError(undefined, 404, `item not found. id:${id}`);
        }
        return resource;
    }
    async readOrDefault(coll, id, partition, defaultValue) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertNotEmpty)(id, "id");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const fqtn = qualify(coll, partition);
        const text = `SELECT data FROM ${fqtn} WHERE id = $1`;
        const values = [id];
        const result = await this.pool.query(text, values);
        if (!result.rowCount) {
            return defaultValue;
        }
        return result.rows[0].data;
    }
    async upsert(coll, data, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const schema = coll;
        const table = partition;
        const fqtn = qualify(schema, table);
        const id = data.id || (0, uuid_1.v4)().toString();
        checkValidId(id);
        const payload = { ...data, id };
        payload[CosmosDatabase_1._partition] = partition;
        addTimestamp(payload);
        const text = `INSERT INTO ${fqtn} (id, data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
            RETURNING data`;
        const values = [id, JSON.stringify(payload)];
        const result = await this.pool.query(text, values);
        return this.extractResource(result);
    }
    async update(coll, data, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertIsDefined)(data, "data");
        (0, assert_1.assertIsDefined)(data.id, "data.id");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const existing = await this.read(coll, data.id, partition);
        const payload = { ...existing, ...data };
        payload[CosmosDatabase_1._partition] = partition;
        addTimestamp(payload);
        const fqtn = qualify(coll, partition);
        const text = `UPDATE ${fqtn} SET data = $1::jsonb WHERE id = $2 RETURNING data`;
        const targetId = payload.id;
        const values = [JSON.stringify(payload), targetId];
        const result = await this.pool.query(text, values);
        if (!result.rowCount) {
            throw new CosmosDatabase_1.CosmosError(undefined, 404, `item not found. id:${data.id}`);
        }
        return this.extractResource(result);
    }
    async delete(coll, id, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        (0, assert_1.assertNotEmpty)(id, "id");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const fqtn = qualify(coll, partition);
        const text = `DELETE FROM ${fqtn} WHERE id = $1 RETURNING id`;
        const values = [id];
        const result = await this.pool.query(text, values);
        if (!result.rowCount) {
            return undefined;
        }
        return { id };
    }
    async find(coll, condition, partition = coll) {
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const fqtn = qualify(coll, partition);
        const builder = new PostgresConditionBuilder_1.PostgresConditionBuilder();
        const { whereClause, orderClause, limitClause, params } = builder.build(condition);
        const clauses = [whereClause, orderClause, limitClause].filter((clause) => clause);
        const text = [`SELECT data FROM ${fqtn} AS t`, ...clauses].join(" ");
        const result = await this.pool.query(text, params);
        return result.rows.map((row) => row.data);
    }
    async findBySQL(coll, query, partition) {
        throw new Error("findBySQL is not supported for postgresql");
    }
    async count(coll, condition, partition = coll) {
        var _a;
        (0, assert_1.assertNotEmpty)(coll, "coll");
        (0, assert_1.assertNotEmpty)(partition, "partition");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");
        const fqtn = qualify(coll, partition);
        const builder = new PostgresConditionBuilder_1.PostgresConditionBuilder();
        const { whereClause, params } = builder.build(condition, true);
        const clauses = [whereClause].filter((clause) => clause);
        const text = [`SELECT COUNT(*)::int AS count FROM ${fqtn} AS t`, ...clauses].join(" ");
        const result = await this.pool.query(text, params);
        return Number(((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.count) || 0);
    }
    extractResource(result) {
        (0, assert_1.assertIsDefined)(result.rowCount);
        if (!result.rowCount) {
            throw new CosmosDatabase_1.CosmosError(undefined, 404, "item not found");
        }
        return result.rows[0].data;
    }
}
exports.PostgresDatabaseImpl = PostgresDatabaseImpl;
//# sourceMappingURL=PostgresDatabaseImpl.js.map