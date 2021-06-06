import { Cosmos } from "../../src/cosmos/Cosmos";
import { CosmosDatabase } from "../../src/";
import dotenv from "dotenv";

dotenv.config(); // .envをprocess.envに割当て

let db: CosmosDatabase;

const COLL_NAME = "UnitTestNode";

describe("Cosmos Test", () => {
    beforeAll(async () => {
        db = await new Cosmos(process.env.COSMOSDB_CONNECTION_STRING).getDatabase("CosmosDB");
        await db.createCollection(COLL_NAME);
    });

    it("create and read items", async () => {
        const origin = {
            id: "user_create_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.delete(COLL_NAME, origin.id, "Users");
            const user1 = await db.create(COLL_NAME, origin, "Users");
            expect(user1.id).toEqual(origin.id);
            expect(user1.firstName).toEqual(origin.firstName);
            expect(user1._partition).toEqual("Users");

            const read1 = await db.read(COLL_NAME, origin.id, "Users");
            expect(read1.id).toEqual(user1.id);
            expect(read1.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
        }
    });

    it("invalid id should not be created or upserted", async () => {
        const origin = {
            id: "user_create_id01_\t_tab", // invalid id which contains tab
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(COLL_NAME, origin, "Users");
            fail("create should not succeed");
        } catch (e) {
            expect(e.message).toContain("id cannot contain");
        }

        try {
            await db.upsert(COLL_NAME, origin, "Users");
            fail("upsert should not succeed");
        } catch (e) {
            expect(e.message).toContain("id cannot contain");
        }
    });

    it("update items", async () => {
        const origin = {
            id: "user_update_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(COLL_NAME, origin, "Users");

            const user1 = { id: "user_update_id01", firstName: "Updated" };

            const updated = await db.update(COLL_NAME, user1, "Users");
            expect(updated.id).toEqual(origin.id);
            expect(updated.firstName).toEqual(user1.firstName);
            expect(updated.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
        }
    });

    it("upsert and find items", async () => {
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
            // prepare data
            const upserted1 = await db.upsert(COLL_NAME, origin, "Users");
            await db.upsert(COLL_NAME, origin2, "Users");
            // a different partition
            await db.upsert(COLL_NAME, origin3, "Members");

            //begin assertions
            expect(upserted1.id).toEqual(origin.id);
            expect(upserted1.firstName).toEqual(origin.firstName);
            expect(upserted1.lastName).toEqual(origin.lastName);

            const read = await db.read(COLL_NAME, origin.id, "Users");
            expect(read.firstName).toEqual(origin.firstName);

            //partial update
            const partialUpdate = { id: origin.id, lastName: "partialUpdate" };
            const updated2 = await db.update(COLL_NAME, partialUpdate, "Users");
            expect(updated2.id).toEqual(origin.id);
            expect(updated2.firstName).toEqual(origin.firstName);
            expect(updated2.lastName).toEqual(partialUpdate.lastName);

            {
                //find should work
                const items = await db.find(
                    COLL_NAME,
                    { filter: { "id%": "user_upsert" }, sort: ["id", "ASC"] },
                    "Users",
                );
                expect(items?.length).toEqual(2);
                expect(items[0]["firstName"]).toEqual(origin.firstName);
                //system fields are removed
                expect(items[0]["_rid"]).toEqual(undefined);
                expect(items[1]["lastName"]).toEqual(origin2.lastName);
            }

            {
                //find using = and CONTAINS
                const items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "lastName CONTAINS": "Upd",
                        },
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 100,
                    },
                    "Users",
                );
                expect(items[0]["id"]).toEqual(origin.id);
                //system fields are removed
                expect(items[0]["_rid"]).toEqual(undefined);
            }

            {
                //find using LIKE
                let items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "address.city LIKE": "%saka",
                        },
                        sort: ["id", "ASC"],
                    },
                    "Users",
                );

                expect(items[0]["id"]).toEqual(origin2.id);

                items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "address.city LIKE": "%k%",
                        },
                        sort: ["id", "ASC"],
                    },
                    "Users",
                );

                expect(items.length).toEqual(2);
                expect(items[0]["id"]).toEqual(origin.id);
                expect(items[1]["id"]).toEqual(origin2.id);
            }

            {
                //count
                const count = await db.count(
                    COLL_NAME,
                    {
                        filter: {
                            "id >": "user_upsert_id01", // id equals "user_upsert_id01"
                            lastName: [origin2.lastName],
                        },
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 100,
                    },
                    "Users",
                );
                expect(count).toEqual(1);
            }

            {
                //find with cross-partition
                const items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "id LIKE": "user_upsert_id0%",
                        },
                        sort: ["id", "ASC"],
                        offset: 0,
                        limit: 100,
                    },
                    undefined, // set the partition to undefined
                );

                expect(items.length).toEqual(3);
                expect(items[0]["id"]).toEqual(origin.id);
                expect(items[1]["id"]).toEqual(origin2.id);
                expect(items[2]["id"]).toEqual(origin3.id);
                expect(items[2]["_partition"]).toEqual("Members");
            }

            {
                //ARRAY_CONTAINS_ANY
                const items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "tags ARRAY_CONTAINS_ANY": "react",
                        },
                        sort: ["id", "ASC"],
                    },
                    "Users",
                );

                expect(items.length).toEqual(2);
                expect(items[0]["id"]).toEqual(origin.id);
                expect(items[1]["id"]).toEqual(origin2.id);
            }
            {
                //ARRAY_CONTAINS_ALL
                let items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "skills ARRAY_CONTAINS_ALL name": ["swimming", "hunting"],
                        },
                        sort: ["id", "ASC"],
                    },
                    "Users",
                );

                // nobody fit this condition
                expect(items.length).toEqual(0);

                items = await db.find(
                    COLL_NAME,
                    {
                        filter: {
                            "skills ARRAY_CONTAINS_ALL name": ["swimming", "fishing"],
                        },
                        sort: ["id", "ASC"],
                    },
                    "Users",
                );

                //origin2 fits
                expect(items.length).toEqual(1);
                expect(items[0]["id"]).toEqual(origin2.id);
            }
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
            await db.delete(COLL_NAME, origin2.id, "Users");
            await db.delete(COLL_NAME, origin3.id, "Members");
        }
    });

    it("404 error will be thrown when reading not exist item", async () => {
        const origin = {
            id: "user_read_not_exist",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.read(COLL_NAME, origin.id, "Users");
        } catch (err) {
            const eStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
            expect(eStr.includes("404")).toEqual(true);
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
        }
    });

    it("404 error will be thrown when reading not exist item", async () => {
        const origin = {
            id: "user_read_not_exist",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.read(COLL_NAME, origin.id, "Users");
        } catch (err) {
            const eStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
            expect(eStr.includes("404")).toEqual(true);
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
        }
    });

    it("default value should be returned if not exist", async () => {
        try {
            const user = await db.readOrDefault(COLL_NAME, "NotExistId", "Users", null);

            expect(user).toBeNull();
        } catch (err) {
            fail("should not throw exception");
        } finally {
        }
    });
});
