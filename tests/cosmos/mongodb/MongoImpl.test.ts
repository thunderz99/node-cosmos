import { CosmosDatabase } from "../../../src/cosmos/CosmosDatabase";
import { MongoClient } from "mongodb";
import { MongoImpl } from "../../../src/cosmos/impl/mongodb/MongoImpl";
import { assertIsDefined } from "../../../src/util/assert";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let db: CosmosDatabase;

const host = "UnitTestNodeMongo" + randomstring.generate(7);

/**
 * Type guard for error
 * @param e error
 * @returns error instance
 */
function isError(e: unknown): e is Error {
    return e instanceof Error;
}

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING || "");

describe("MongoImpl Test", () => {
    beforeAll(async () => {
        //db = await new MongoImpl(process.env.MONGODB_CONNECTION_STRING).getDatabase(host);
    });

    it("create and read items", async () => {
        try {
            console.log(`connectionString is:${process.env.MONGODB_CONNECTION_STRING}`);
            console.log("Directly Connected to MongoDB");

            const database = client.db("ServiceManagement");

            const collection = database.collection("Customers");

            const result = await collection.findOne<Record<string, unknown>>();

            assertIsDefined(result);

            console.log(`result found:${result.id}`);

            // const origin = {
            //     id: "user_create_id01" + randomstring.generate(7),
            //     firstName: "Anony",
            //     lastName: "Nobody",
            // };

            // try {
            //     await db.delete(host, origin.id, "Users");
            //     const user1 = await db.create(host, origin, "Users");
            //     expect(user1.id).toEqual(origin.id);
            //     expect(user1.firstName).toEqual(origin.firstName);
            //     expect(user1._partition).toEqual("Users");

            //     const read1 = await db.read(host, origin.id, "Users");
            //     expect(read1.id).toEqual(user1.id);
            //     expect(read1.lastName).toEqual(origin.lastName);
            // } finally {
            //     await db.delete(host, origin.id, "Users");
            // }
        } finally {
            await client.close();
        }
    });
});
