import { CosmosDatabase, CosmosDocument } from "../../../src/cosmos/CosmosDatabase";

import { MongoImpl } from "../../../src/cosmos/impl/mongodb/MongoImpl";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let db: CosmosDatabase;

let account: MongoImpl;

export const LOCAL_CONNECTION_STRING = "mongodb://localhost:27017/?replicaSet=rs0";

const host = "UnitTestNodeMongo" + randomstring.generate(7);

/**
 * Type guard for error
 * @param e error
 * @returns error instance
 */
function isError(e: unknown): e is Error {
    return e instanceof Error;
}

describe("MongoImpl Test", () => {
    beforeAll(async () => {
        account = new MongoImpl(
            process.env.MONGODB_CONNECTION_STRING || LOCAL_CONNECTION_STRING,
            true,
            true,
        );
        db = await account.getDatabase(host);

        // error will not occur if the db already exist
        await account._createDatabaseIfNotExist(host);
    });

    afterAll(async () => {
        await account.deleteDatabase(host);
        await account.close();
    });

    it("create and read items", async () => {
        const origin = {
            id: "user_create_id01" + randomstring.generate(7),
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.delete(host, origin.id, "Users");
            const user1 = await db.create(host, origin, "Users");
            expect(user1.id).toEqual(origin.id);
            expect(user1.firstName).toEqual(origin.firstName);
            expect(user1._partition).toEqual("Users");
            expect(user1._expireAt).toBeUndefined();

            const read1 = await db.read(host, origin.id, "Users");
            expect(read1.id).toEqual(user1.id);
            expect(read1.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(host, origin.id, "Users");
        }
    });

    it("invalid id should not be created or upserted", async () => {
        const origin = {
            id: "user_create_id01_\t_tab", // invalid id which contains tab
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(host, origin, "Users");
            fail("create should not succeed");
        } catch (e) {
            if (isError(e)) {
                expect(e.message).toContain("id cannot contain");
            }
        }

        try {
            await db.upsert(host, origin, "Users");
            fail("upsert should not succeed");
        } catch (e) {
            if (isError(e)) {
                expect(e.message).toContain("id cannot contain");
            }
        }
    });

    it("update items", async () => {
        const origin = {
            id: "user_update_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(host, origin, "Users");

            const user1 = { id: "user_update_id01", firstName: "Updated" };

            const updated = await db.update(host, user1, "Users");
            expect(updated.id).toEqual(origin.id);
            expect(updated.firstName).toEqual(user1.firstName);
            expect(updated.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(host, origin.id, "Users");
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
            // prepare data
            const upserted1 = await db.upsert(host, origin, "Users");
            await db.upsert(host, origin2, "Users");
            // a different partition
            await db.upsert(host, origin3, "Members");

            //begin assertions
            expect(upserted1.id).toEqual(origin.id);
            expect(upserted1.firstName).toEqual(origin.firstName);
            expect(upserted1.lastName).toEqual(origin.lastName);

            const read = await db.read(host, origin.id, "Users");
            expect(read.firstName).toEqual(origin.firstName);

            //partial update
            const partialUpdate = { id: origin.id, lastName: "partialUpdate" };
            const updated2 = await db.update(host, partialUpdate, "Users");
            expect(updated2.id).toEqual(origin.id);
            expect(updated2.firstName).toEqual(origin.firstName);
            expect(updated2.lastName).toEqual(partialUpdate.lastName);

            {
                //find should work, using special LIKE
                const items = await db.find(
                    host,
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
                //find using CONTAINS
                const items = await db.find(
                    host,
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
                    host,
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
                    host,
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
                    host,
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
                //count should ignore offset and limit
                const count = await db.count(
                    host,
                    {
                        filter: {},
                        sort: ["firstName", "ASC"],
                        offset: 0,
                        limit: 1,
                    },
                    "Users",
                );
                expect(count).toEqual(2);
            }

            {
                // find / count using cross partition is not supported for mongodb
            }

            {
                //ARRAY_CONTAINS_ANY
                const items = await db.find(
                    host,
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
                    host,
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
                    host,
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
            await db.delete(host, origin.id, "Users");
            await db.delete(host, origin2.id, "Users");
            await db.delete(host, origin3.id, "Members");
        }
    });

    it("404 error will be thrown when reading not exist item", async () => {
        const origin = {
            id: "user_read_not_exist",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.read(host, origin.id, "Users");
        } catch (err) {
            const eStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
            expect(eStr.includes("404")).toEqual(true);
        } finally {
            await db.delete(host, origin.id, "Users");
        }
    });

    it("404 error will be thrown when reading not exist item", async () => {
        const origin = {
            id: "user_read_not_exist",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.read(host, origin.id, "Users");
        } catch (err) {
            const eStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
            expect(eStr.includes("404")).toEqual(true);
        } finally {
            await db.delete(host, origin.id, "Users");
        }
    });

    it("default value should be returned if not exist", async () => {
        try {
            const user = await db.readOrDefault(host, "NotExistId", "Users", null);

            expect(user).toBeNull();
        } catch (err) {
            fail("should not throw exception");
        }
    });

    it("ttl and expireAt should be set correctly", async () => {
        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
        const origin = {
            id: "ttl_and_expireAt_" + randomstring.generate(7),
            firstName: "Tom",
            lastName: "Banks",
            ttl: thirtyDaysInSeconds,
        };

        try {
            await db.delete(host, origin.id, "Users");

            // test create
            const user1 = await db.create(host, origin, "Users");
            expect(user1.id).toEqual(origin.id);
            expect(user1.firstName).toEqual(origin.firstName);
            expect(user1._partition).toEqual("Users");

            const currentDate = new Date();
            // Create a new Date 30 days from now
            const expectedDate = new Date(currentDate.getTime() + thirtyDaysInSeconds * 1000);

            expect((user1._expireAt as Date).getTime()).toBeGreaterThanOrEqual(
                expectedDate.getTime() - 1000,
            );
            expect((user1._expireAt as Date).getTime()).toBeLessThanOrEqual(
                expectedDate.getTime() + 1000,
            );

            // test read
            const read1 = await db.read(host, origin.id, "Users");
            expect(read1.id).toEqual(user1.id);
            expect(read1.lastName).toEqual(origin.lastName);

            expect((read1._expireAt as Date).getTime()).toBeGreaterThanOrEqual(
                expectedDate.getTime() - 1000,
            );
            expect((read1._expireAt as Date).getTime()).toBeLessThanOrEqual(
                expectedDate.getTime() + 1000,
            );

            // test update

            let update1: CosmosDocument = Object.assign({}, origin);
            update1.ttl = thirtyDaysInSeconds * 2;

            update1 = await db.update(host, update1, "Users");

            const expectedDate2 = new Date(currentDate.getTime() + (update1.ttl || 0) * 1000);

            expect((update1._expireAt as Date).getTime()).toBeGreaterThanOrEqual(
                expectedDate2.getTime() - 1000,
            );
            expect((update1._expireAt as Date).getTime()).toBeLessThanOrEqual(
                expectedDate2.getTime() + 1000,
            );

            // test upsert

            let upsert1: CosmosDocument = Object.assign({}, origin);
            upsert1.ttl = thirtyDaysInSeconds * 3;

            upsert1 = await db.upsert(host, update1, "Users");

            const expectedDate3 = new Date(currentDate.getTime() + (upsert1.ttl || 0) * 1000);

            expect((upsert1._expireAt as Date).getTime()).toBeGreaterThanOrEqual(
                expectedDate3.getTime() - 1000,
            );
            expect((upsert1._expireAt as Date).getTime()).toBeLessThanOrEqual(
                expectedDate3.getTime() + 1000,
            );
        } finally {
            await db.delete(host, origin.id, "Users");
        }
    });
});
