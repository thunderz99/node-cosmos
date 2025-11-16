import { Cosmos } from "../../src/cosmos/Cosmos";
import { CosmosBuilder } from "../../src/cosmos/CosmosBuilder";
import { CosmosDatabase } from "../../src/cosmos/CosmosDatabase";
import dotenv from "dotenv";
import randomstring from "randomstring";

dotenv.config(); // load .env file to process.env

let cosmos: Cosmos;
let db: CosmosDatabase;

const COLL_NAME = "UnitTestNode_Builder" + randomstring.generate(7);

describe("CosmosBuilder Test", () => {
    beforeAll(async () => {
        cosmos = new CosmosBuilder()
            .withConnectionString(process.env.COSMOSDB_CONNECTION_STRING || "")
            .build();
        db = await cosmos.getDatabase("CosmosDB");
        await db.createCollection(COLL_NAME);
    });

    afterAll(async () => {
        if (db) {
            await db.deleteCollection(COLL_NAME);
        }
    });

    it("cosmos: create and read items", async () => {
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

describe("CosmosBuilder.normalizeConnectionString", () => {
    it("replaces localhost with 127.0.0.1", () => {
        const input = "postgres://user:pass@localhost:5432/mydb";
        const normalized = CosmosBuilder.normalizeConnectionString(input);
        expect(normalized).toBe("postgres://user:pass@127.0.0.1:5432/mydb");
    });

    it("returns original string for other hosts", () => {
        const input = "postgres://user:pass@db.example.com:5432/mydb";
        const normalized = CosmosBuilder.normalizeConnectionString(input);
        expect(normalized).toBe(input);
    });

    it("returns undefined when input undefined", () => {
        expect(CosmosBuilder.normalizeConnectionString(undefined)).toBeUndefined();
    });

    it("returns raw string if parsing fails", () => {
        const input = "not a url";
        const normalized = CosmosBuilder.normalizeConnectionString(input);
        expect(normalized).toBe(input);
    });

    it("converts jdbc:postgresql URL with user/password query parameters", () => {
        const input = "jdbc:postgresql://localhost:5432/postgres?user=postgres&password=postgres";
        const normalized = CosmosBuilder.normalizeConnectionString(input);
        expect(normalized).toBe("postgres://postgres:postgres@127.0.0.1:5432/postgres");
    });

    it("converts postgresql scheme to postgres and promotes credentials", () => {
        const input = "postgresql://localhost:5432/postgres?user=postgres&password=postgres";
        const normalized = CosmosBuilder.normalizeConnectionString(input);
        expect(normalized).toBe("postgres://postgres:postgres@127.0.0.1:5432/postgres");
    });
});
