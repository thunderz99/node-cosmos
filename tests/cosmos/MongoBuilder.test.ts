import { Cosmos } from "../../src/cosmos/Cosmos";
import { CosmosBuilder } from "../../src/cosmos/CosmosBuilder";
import { CosmosDatabase } from "../../src/cosmos/CosmosDatabase";
import { LOCAL_CONNECTION_STRING } from "./mongodb/MongoImpl.test";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let cosmos: Cosmos;
let db: CosmosDatabase;

const COLL_NAME = "UnitTestNode_MongoBuilder" + randomstring.generate(7);

describe("MongoBuilder Test", () => {
    beforeAll(async () => {
        cosmos = new CosmosBuilder()
            .withConnectionString(process.env.MONGODB_CONNECTION_STRING || LOCAL_CONNECTION_STRING)
            .withDatabaseType("mongodb")
            .withExpireAtEnabled(true)
            .withEtagEnabled(true)
            .build();
        db = await cosmos.getDatabase("CosmosDB");
        await db.createCollection(COLL_NAME);
    });

    afterAll(async () => {
        if (db) {
            await db.deleteCollection(COLL_NAME);
        }
    });

    it("mongo: create and read items", async () => {
        const origin = {
            id: "user_create_id01" + randomstring.generate(7),
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

    it("mongo: create and read items", async () => {
        const origin = {
            id: "user_create_id01" + randomstring.generate(7),
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
});
