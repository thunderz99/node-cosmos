import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";
import { CosmosBuilder } from "../../../../src/cosmos/CosmosBuilder";
dotenv.config();

export type SchemaDefinition = {
    schema: string;
    tables: string[];
};

export type PgEnvironment = {
    pool: Pool;
    connectionString: string;
    cleanup: () => Promise<void>;
};

const buildPoolConfig = (connectionString: string): PoolConfig => {
    const normalized =
        CosmosBuilder.normalizeConnectionString(connectionString) ?? connectionString;
    return { connectionString: normalized };
};

export const createPostgresTestEnvironment = async (
    definitions: SchemaDefinition[],
): Promise<PgEnvironment> => {
    const connectionString = process.env.POSTGRES_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error(
            "POSTGRES_CONNECTION_STRING is not set. Please configure it in your .env file.",
        );
    }

    const pool = new Pool(buildPoolConfig(connectionString));
    await createSchemasAndTables(pool, definitions);

    return {
        pool,
        connectionString,
        cleanup: async () => {
            const client = await pool.connect();
            try {
                for (const { schema } of definitions) {
                    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
                }
            } finally {
                client.release();
            }
        },
    };
};

const createSchemasAndTables = async (
    pool: Pool,
    definitions: SchemaDefinition[],
): Promise<void> => {
    const client = await pool.connect();
    try {
        for (const { schema, tables } of definitions) {
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
            for (const table of tables) {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (
                        id text NOT NULL,
                        data jsonb NOT NULL,
                        CONSTRAINT "${table}_pkey" PRIMARY KEY (id)
                    );
                `);
            }
        }
    } finally {
        client.release();
    }
};
