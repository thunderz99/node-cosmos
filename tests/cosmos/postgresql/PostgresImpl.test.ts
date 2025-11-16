import { CosmosDatabase, CosmosDocument } from "../../../src/cosmos/CosmosDatabase";

import { PostgresImpl } from "../../../src/cosmos/impl/postgresql/PostgresImpl";
import { createPostgresTestEnvironment } from "./utils/postgresTestUtils";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let db: CosmosDatabase;
let account: PostgresImpl;
let cleanup: (() => Promise<void>) | undefined;

const SCHEMA_NAME = "UnitTest_Postgres_" + randomstring.generate(7);
const USERS_TABLE = "Users";
const MEMBERS_TABLE = "Members";

describe("PostgresImpl Test", () => {
    beforeAll(async () => {
        const env = await createPostgresTestEnvironment([
            { schema: SCHEMA_NAME, tables: [USERS_TABLE, MEMBERS_TABLE] },
        ]);
        cleanup = env.cleanup;
        account = new PostgresImpl(env.connectionString, () => env.pool);
        db = await account.getDatabase("CosmosDB");
        await db.createCollection(SCHEMA_NAME);
    });

    afterAll(async () => {
        if (cleanup) {
            await cleanup();
        }
        await account.close();
    });

    it("create and read items", async () => {
        const origin = {
            id: "user_create_id01" + randomstring.generate(7),
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.delete(SCHEMA_NAME, origin.id, USERS_TABLE);
            const user1 = await db.create(SCHEMA_NAME, origin, USERS_TABLE);
            expect(user1.id).toEqual(origin.id);
            expect(user1.firstName).toEqual(origin.firstName);
            expect(user1._partition).toEqual(USERS_TABLE);

            const read1 = await db.read(SCHEMA_NAME, origin.id, USERS_TABLE);
            expect(read1.id).toEqual(user1.id);
            expect(read1.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(SCHEMA_NAME, origin.id, USERS_TABLE);
        }
    });

    it("invalid id should not be created or upserted", async () => {
        const origin = {
            id: "user_create_id01_\t_tab",
            firstName: "Anony",
            lastName: "Nobody",
        };

        await expect(db.create(SCHEMA_NAME, origin, USERS_TABLE)).rejects.toThrow(
            "id cannot contain",
        );
        await expect(db.upsert(SCHEMA_NAME, origin, USERS_TABLE)).rejects.toThrow(
            "id cannot contain",
        );
    });

    it("update items", async () => {
        const origin = {
            id: "user_update_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(SCHEMA_NAME, origin, USERS_TABLE);

            const user1 = { id: "user_update_id01", firstName: "Updated" };

            const updated = await db.update(SCHEMA_NAME, user1, USERS_TABLE);
            expect(updated.id).toEqual(origin.id);
            expect(updated.firstName).toEqual(user1.firstName);
            expect(updated.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(SCHEMA_NAME, origin.id, USERS_TABLE);
        }
    });

    it("upsert, find and count items", async () => {
        const origin = {
            id: "user_upsert_id01",
            firstName: "Anony",
            lastName: "Nobody",
            address: {
                country: "Japan",
                city: "Tokyo",
            },
            tags: ["react", "java"],
            skills: [
                {
                    id: "S001",
                    name: "fishing",
                },
                {
                    id: "S002",
                    name: "hunting",
                },
            ],
        };
        const origin2 = {
            id: "user_upsert_id02",
            firstName: "Tom",
            lastName: "Luck",
            address: {
                country: "Japan",
                city: "Osaka",
            },
            tags: ["react", "typescript"],
            skills: [
                {
                    id: "S001",
                    name: "fishing",
                },
                {
                    id: "S003",
                    name: "swimming",
                },
            ],
        };
        const origin3 = {
            id: "user_upsert_id03",
            firstName: "Judy",
            lastName: "Hawks",
            address: {
                country: "England",
                city: "London",
            },
            tags: ["java", "go"],
        };

        try {
            const upserted1 = await db.upsert(SCHEMA_NAME, origin, USERS_TABLE);
            await db.upsert(SCHEMA_NAME, origin2, USERS_TABLE);
            await db.upsert(SCHEMA_NAME, origin3, MEMBERS_TABLE);

            expect(upserted1.id).toEqual(origin.id);
            expect(upserted1.firstName).toEqual(origin.firstName);
            expect(upserted1.lastName).toEqual(origin.lastName);

            const read = await db.read(SCHEMA_NAME, origin.id, USERS_TABLE);
            expect(read.firstName).toEqual(origin.firstName);

            const partialUpdate = { id: origin.id, lastName: "partialUpdate" };
            const updated2 = await db.update(SCHEMA_NAME, partialUpdate, USERS_TABLE);
            expect(updated2.id).toEqual(origin.id);
            expect(updated2.firstName).toEqual(origin.firstName);
            expect(updated2.lastName).toEqual(partialUpdate.lastName);

            {
                const items = await db.find(
                    SCHEMA_NAME,
                    { filter: { "id%": "user_upsert" }, sort: ["id", "ASC"] },
                    USERS_TABLE,
                );

                expect(items.length).toEqual(2);
                expect(items[0]["firstName"]).toEqual(origin.firstName);
                expect(items[1]["lastName"]).toEqual(origin2.lastName);
            }

            {
                const items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "lastName CONTAINS": "Upd",
                        },
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 100,
                    },
                    USERS_TABLE,
                );
                expect(items[0]["id"]).toEqual(origin.id);
            }

            {
                let items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "address.city LIKE": "%saka",
                        },
                        sort: ["id", "ASC"],
                    },
                    USERS_TABLE,
                );

                expect(items[0]["id"]).toEqual(origin2.id);

                items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "address.city LIKE": "%k%",
                        },
                        sort: ["id", "ASC"],
                    },
                    USERS_TABLE,
                );

                expect(items.length).toEqual(2);
                expect(items[0]["id"]).toEqual(origin.id);
                expect(items[1]["id"]).toEqual(origin2.id);
            }

            {
                const count = await db.count(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "id >": "user_upsert_id01",
                            lastName: [origin2.lastName],
                        },
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 100,
                    },
                    USERS_TABLE,
                );
                expect(count).toEqual(1);
            }

            {
                const count = await db.count(
                    SCHEMA_NAME,
                    {
                        filter: {},
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 1,
                    },
                    USERS_TABLE,
                );
                expect(count).toEqual(2);
            }

            {
                const items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "tags ARRAY_CONTAINS_ANY": "react",
                        },
                        sort: ["id", "ASC"],
                    },
                    USERS_TABLE,
                );

                expect(items.length).toEqual(2);
                expect(items[0]["id"]).toEqual(origin.id);
                expect(items[1]["id"]).toEqual(origin2.id);
            }

            {
                let items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "skills ARRAY_CONTAINS_ALL name": ["swimming", "hunting"],
                        },
                        sort: ["id", "ASC"],
                    },
                    USERS_TABLE,
                );
                expect(items.length).toEqual(0);

                items = await db.find(
                    SCHEMA_NAME,
                    {
                        filter: {
                            "skills ARRAY_CONTAINS_ALL name": ["swimming", "fishing"],
                        },
                        sort: ["id", "ASC"],
                    },
                    USERS_TABLE,
                );
                expect(items.length).toEqual(1);
                expect(items[0]["id"]).toEqual(origin2.id);
            }
        } finally {
            await db.delete(SCHEMA_NAME, origin.id, USERS_TABLE);
            await db.delete(SCHEMA_NAME, origin2.id, USERS_TABLE);
            await db.delete(SCHEMA_NAME, origin3.id, MEMBERS_TABLE);
        }
    });

    it("404 error will be thrown when reading not exist item", async () => {
        const origin = {
            id: "user_read_not_exist",
            firstName: "Anony",
            lastName: "Nobody",
        };

        await db.delete(SCHEMA_NAME, origin.id, USERS_TABLE);
        try {
            await db.read(SCHEMA_NAME, origin.id, USERS_TABLE);
        } catch (err) {
            const message =
                typeof err === "object" && err !== null && "message" in err
                    ? String((err as { message?: string }).message)
                    : String(err);
            expect(message).toContain("item not found");
            return;
        }
        throw new Error("read should have thrown");
    });

    it("default value should be returned if not exist", async () => {
        const user = await db.readOrDefault(SCHEMA_NAME, "NotExistId", USERS_TABLE, null);
        expect(user).toBeNull();
    });
});
