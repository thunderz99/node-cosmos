import { _generateFilter, isJsonObject } from "../../../src/cosmos/condition/Condition";

describe("Condition Test", () => {
    it("query should be generated for filter", () => {
        {
            // undefiend filters
            const { queries, params } = _generateFilter(undefined);
            expect(queries).toStrictEqual([]);
            expect(params).toStrictEqual([]);
        }
        {
            // empty filters
            const { queries, params } = _generateFilter({});
            expect(queries).toStrictEqual([]);
            expect(params).toStrictEqual([]);
        }

        {
            // normal filters
            const { queries, params } = _generateFilter({
                id: "id010", // id equal to 'id010'
                "lastName%": "Ban", // last name STARTSWITH "Ban"
                location: ["New York", "Paris"], // location is 'New York' or 'Paris'
            });

            expect(queries.join(" AND ")).toEqual(
                'r["id"] = @id AND STARTSWITH(r["lastName"], @lastName) AND ARRAY_CONTAINS(@location, r["location"])',
            );
            expect(params[0]).toStrictEqual({ name: "@id", value: "id010" });
            expect(params[1]).toStrictEqual({ name: "@lastName", value: "Ban" });
            expect(params[2]).toStrictEqual({ name: "@location", value: ["New York", "Paris"] });
        }

        {
            // filters with expressions
            const { queries, params } = _generateFilter({
                "id !=": "id010", // id not equal to 'id010'
                "lastName CONTAINS": "Ban", // last name CONTAINS "Ban"
                "location ARRAY_CONTAINS": "New York", // location array contains 'New York'
            });

            expect(queries.join(" AND ")).toEqual(
                'r["id"] != @id AND CONTAINS(r["lastName"], @lastName) AND ARRAY_CONTAINS(r["location"], @location)',
            );
            expect(params[0]).toStrictEqual({ name: "@id", value: "id010" });
            expect(params[1]).toStrictEqual({ name: "@lastName", value: "Ban" });
            expect(params[2]).toStrictEqual({ name: "@location", value: "New York" });
        }
    });

    it("isJsonObject should work", () => {
        expect(isJsonObject(undefined)).toBe(false);
        expect(isJsonObject(null)).toBe(false);
        expect(isJsonObject("test")).toBe(false);
        expect(isJsonObject(123)).toBe(false);
        expect(isJsonObject([])).toBe(false);
        expect(isJsonObject({})).toBe(true);
        expect(isJsonObject({ id: "id001" })).toBe(true);
    });
});
