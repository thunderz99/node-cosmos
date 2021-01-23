import { Cosmos, CosmosDatabase, CosmosDocument } from "../../src/cosmos/Cosmos";

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

    it("update items", async () => {
        const origin = {
            id: "user_update_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            await db.create(COLL_NAME, origin, "Users");

            const user1 = { id: "user_update_id01", firstName: "Updated" };

            //partial update
            const updated = await db.update(COLL_NAME, user1, "Users");
            expect(updated.id).toEqual(origin.id);
            expect(updated.firstName).toEqual(user1.firstName);
            expect(updated.lastName).toEqual(origin.lastName);
        } finally {
            await db.delete(COLL_NAME, origin.id, "Users");
        }
    });

    it("upsert items", async () => {
        const origin = {
            id: "user_upsert_id01",
            firstName: "Anony",
            lastName: "Nobody",
        };

        try {
            const upserted1 = await db.upsert(COLL_NAME, origin, "Users");

            expect(upserted1.id).toEqual(origin.id);
            expect(upserted1.firstName).toEqual(origin.firstName);
            expect(upserted1.lastName).toEqual(origin.lastName);

            const read = await db.read(COLL_NAME, origin.id, "Users");
            expect(read.firstName).toEqual(origin.firstName);

            //partial upsert TODO
            // const partialUpdate = { id: origin.id, lastName: "partialUpdate" };
            // const upserted2 = await db.upsert(COLL_NAME, partialUpdate, "Users");
            // expect(upserted2.id).toEqual(origin.id);
            // expect(upserted2.firstName).toEqual(origin.firstName);
            // expect(upserted2.lastName).toEqual(partialUpdate.lastName);

            //find should work
            let result = await db.find(
                COLL_NAME,
                { filter: { lastName: origin.lastName } },
                "Users",
            );
            expect(result.items?.length).toEqual(1);
            expect(result.items[0]["firstName"]).toEqual(origin.firstName);

            //find with condition

            result = await db.find(
                COLL_NAME,
                {
                    filter: {
                        id: "user_upsert_id01", // id equals "user_upsert_id01"
                        lastName: origin.lastName,
                    },
                    sort: [["firstName", "ASC"]],
                    offset: 0,
                    limit: 100,
                },
                "Users",
            );
            expect(result.items[0]["id"]).toEqual(origin.id);
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
});
