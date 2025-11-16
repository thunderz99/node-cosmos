import { Cosmos } from "../../src/cosmos/Cosmos";
import { CosmosBuilder } from "../../src/cosmos/CosmosBuilder";
import { CosmosDatabase } from "../../src/cosmos/CosmosDatabase";
import { createPostgresTestEnvironment } from "./postgresql/utils/postgresTestUtils";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let cosmos: Cosmos;
let db: CosmosDatabase;
let cleanup: (() => Promise<void>) | undefined;

const COLL_NAME = "UnitTest_PostgresBuilder_" + randomstring.generate(7);
const TABLE_NAME = "Users";

describe("PostgresBuilder Test", () => {
    beforeAll(async () => {
        const env = await createPostgresTestEnvironment([
            { schema: COLL_NAME, tables: [TABLE_NAME] },
        ]);
        cleanup = env.cleanup;

        cosmos = new CosmosBuilder()
            .withConnectionString(env.connectionString)
            .withDatabaseType(CosmosBuilder.POSTGRES)
            .withPostgresPoolFactory(() => env.pool)
            .build();

        db = await cosmos.getDatabase("CosmosDB");
        await db.createCollection(COLL_NAME);
    });

    afterAll(async () => {
        if (cleanup) {
            await cleanup();
        }
        if (cosmos) {
            await cosmos.close();
        }
    });

    it("postgres: create and read items", async () => {
        const origin = {
            id: "user_create_id01" + randomstring.generate(7),
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.delete(COLL_NAME, origin.id, TABLE_NAME);
            const user1 = await db.create(COLL_NAME, origin, TABLE_NAME);
            expect(user1.id).toEqual(origin.id);
            expect(user1.firstName).toEqual(origin.firstName);
            expect(user1._partition).toEqual(TABLE_NAME);

            const read1 = await db.read(COLL_NAME, origin.id, TABLE_NAME);
            expect(read1.id).toEqual(user1.id);
            expect(read1.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(COLL_NAME, origin.id, TABLE_NAME);
        }
    });
});
