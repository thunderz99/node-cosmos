import { Condition } from "../../condition/Condition";
import {
    CosmosDatabase,
    CosmosDocument,
    CosmosError,
    CosmosId,
    _partition as partitionField,
} from "../../CosmosDatabase";
import { CosmosContainer } from "../../CosmosContainer";
import { Pool, QueryResult } from "pg";
import { PostgresConditionBuilder } from "./PostgresConditionBuilder";
import { assertIsDefined, assertNotEmpty } from "../../../util/assert";
import { v4 as uuidv4 } from "uuid";

const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;

const checkValidId = (id: string) => {
    if (!id) {
        throw new Error("id cannot be empty");
    }
    if (id.includes("\t") || id.includes("\n") || id.includes("\r")) {
        throw new Error("id cannot contain \t or \n or \r");
    }
};

const addTimestamp = (data: Record<string, unknown>): void => {
    const epochMillis: number = Date.now();
    data["_ts"] = epochMillis / 1000;
};

const ensureIdentifier = (value: string, label: string) => {
    assertNotEmpty(value, label);
    if (!identifierRegex.test(value)) {
        throw new Error(`${label} contains invalid characters: ${value}`);
    }
};

const qualify = (schema: string, table: string): string => {
    return `"${schema}"."${table}"`;
};

export class PostgresDatabaseImpl implements CosmosDatabase {
    private readonly pool: Pool;
    private readonly dbName: string;
    private readonly collectionMap: Map<string, CosmosContainer> = new Map();

    constructor(pool: Pool, dbName: string) {
        this.pool = pool;
        this.dbName = dbName;
    }

    public async createCollection(coll: string): Promise<CosmosContainer> {
        ensureIdentifier(coll, "coll");
        const container = new CosmosContainer(coll, { schema: coll });
        this.collectionMap.set(coll, container);
        return container;
    }

    public async deleteCollection(coll: string): Promise<void> {
        this.collectionMap.delete(coll);
    }

    public async getCollection(coll: string): Promise<CosmosContainer> {
        let collection = this.collectionMap.get(coll);
        if (!collection) {
            collection = await this.createCollection(coll);
        }
        return collection;
    }

    public async create(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");

        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const schema = coll;
        const table = partition;
        const fqtn = qualify(schema, table);

        const id = data.id || uuidv4().toString();
        checkValidId(id);

        const payload: CosmosDocument = { ...data, id };
        payload[partitionField] = partition;
        addTimestamp(payload);

        const text = `INSERT INTO ${fqtn} (id, data) VALUES ($1, $2::jsonb) RETURNING data`;
        const values = [id, JSON.stringify(payload)];
        const result = await this.pool.query<{ data: CosmosDocument }>(text, values);

        return this.extractResource(result);
    }

    public async read(
        coll: string,
        id: string,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        const resource = await this.readOrDefault(coll, id, partition, null);
        if (!resource) {
            throw new CosmosError(undefined, 404, `item not found. id:${id}`);
        }
        return resource;
    }

    public async readOrDefault(
        coll: string,
        id: string,
        partition: string,
        defaultValue: CosmosDocument | null,
    ): Promise<CosmosDocument | null> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertNotEmpty(id, "id");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const fqtn = qualify(coll, partition);
        const text = `SELECT data FROM ${fqtn} WHERE id = $1`;
        const values = [id];
        const result = await this.pool.query<{ data: CosmosDocument }>(text, values);
        if (!result.rowCount) {
            return defaultValue;
        }
        return result.rows[0].data as CosmosDocument;
    }

    public async upsert(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");

        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const schema = coll;
        const table = partition;
        const fqtn = qualify(schema, table);

        const id = data.id || uuidv4().toString();
        checkValidId(id);

        const payload: CosmosDocument = { ...data, id };
        payload[partitionField] = partition;
        addTimestamp(payload);

        const text = `INSERT INTO ${fqtn} (id, data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
            RETURNING data`;
        const values = [id, JSON.stringify(payload)];
        const result = await this.pool.query<{ data: CosmosDocument }>(text, values);
        return this.extractResource(result);
    }

    public async update(
        coll: string,
        data: CosmosDocument,
        partition: string = coll,
    ): Promise<CosmosDocument> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertIsDefined(data, "data");
        assertIsDefined(data.id, "data.id");

        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const existing = await this.read(coll, data.id, partition);
        const payload: CosmosDocument = { ...existing, ...data };
        payload[partitionField] = partition;
        addTimestamp(payload);

        const fqtn = qualify(coll, partition);
        const text = `UPDATE ${fqtn} SET data = $1::jsonb WHERE id = $2 RETURNING data`;
        const targetId = payload.id as string;
        const values = [JSON.stringify(payload), targetId];
        const result = await this.pool.query<{ data: CosmosDocument }>(text, values);
        if (!result.rowCount) {
            throw new CosmosError(undefined, 404, `item not found. id:${data.id}`);
        }
        return this.extractResource(result);
    }

    public async delete(
        coll: string,
        id: string,
        partition: string = coll,
    ): Promise<CosmosId> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        assertNotEmpty(id, "id");

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

    public async find(
        coll: string,
        condition: Condition,
        partition: string = coll,
    ): Promise<CosmosDocument[]> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const fqtn = qualify(coll, partition);
        const builder = new PostgresConditionBuilder();
        const { whereClause, orderClause, limitClause, params } = builder.build(condition);

        const clauses = [whereClause, orderClause, limitClause].filter((clause) => clause);
        const text = [`SELECT data FROM ${fqtn} AS t`, ...clauses].join(" ");

        const result = await this.pool.query<{ data: CosmosDocument }>(text, params);
        return result.rows.map((row) => row.data as CosmosDocument);
    }

    public async findBySQL(
        coll: string,
        query: string,
        partition?: string,
    ): Promise<CosmosDocument[]> {
        throw new Error("findBySQL is not supported for postgresql");
    }

    public async count(
        coll: string,
        condition: Condition,
        partition: string = coll,
    ): Promise<number> {
        assertNotEmpty(coll, "coll");
        assertNotEmpty(partition, "partition");
        ensureIdentifier(coll, "coll");
        ensureIdentifier(partition, "partition");

        const fqtn = qualify(coll, partition);
        const builder = new PostgresConditionBuilder();
        const { whereClause, params } = builder.build(condition, true);
        const clauses = [whereClause].filter((clause) => clause);
        const text = [`SELECT COUNT(*)::int AS count FROM ${fqtn} AS t`, ...clauses].join(" ");

        const result = await this.pool.query<{ count: string }>(text, params);
        return Number(result.rows[0]?.count || 0);
    }

    private extractResource(result: QueryResult<{ data: CosmosDocument }>): CosmosDocument {
        assertIsDefined(result.rowCount);
        if (!result.rowCount) {
            throw new CosmosError(undefined, 404, "item not found");
        }
        return result.rows[0].data as CosmosDocument;
    }
}
