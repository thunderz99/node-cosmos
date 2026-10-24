import { CosmosBuilder } from "../../src/cosmos/CosmosBuilder";

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
