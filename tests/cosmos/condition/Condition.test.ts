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

            expect(queries[0]).toMatch(/r\["id"\] = @id_(\d)*/);
            expect(queries[1]).toMatch(/STARTSWITH\(r\["lastName"\], @lastName_(\d)\)*/);
            expect(queries[2]).toMatch(/ARRAY_CONTAINS\(@location_(\d)*, r\["location"\]\)/);

            expect(params[0]).toMatchObject({
                name: /@id_(\d)*/,
                value: "id010",
            });
            expect(params[1]).toMatchObject({
                name: /@lastName_(\d)*/,
                value: "Ban",
            });

            expect(params[2]).toMatchObject({
                name: /@location_(\d)*/,
                value: ["New York", "Paris"],
            });
        }

        {
            // filters with duplicate keys
            const { queries, params } = _generateFilter({
                "number >=": 60,
                "number <": 90,
            });

            expect(queries[0]).toMatch(/r\["number"\] >= @number_(\d)*/);
            expect(queries[1]).toMatch(/r\["number"\] < @number_(\d)*/);

            expect(params[0]).toMatchObject({
                name: /@number_(\d)*/,
                value: 60,
            });
            expect(params[1]).toMatchObject({
                name: /@number_(\d)*/,
                value: 90,
            });
        }

        {
            // filters with expressions
            const { queries, params } = _generateFilter({
                "id !=": "id010", // id not equal to 'id010'
                "lastName CONTAINS": "Ban", // last name CONTAINS "Ban"
                "location ARRAY_CONTAINS": "New York", // location array contains 'New York'
            });

            expect(queries[0]).toMatch(/r\["id"\] != @id_(\d)*/);
            expect(queries[1]).toMatch(/CONTAINS\(r\["lastName"\], @lastName_(\d)\)*/);
            expect(queries[2]).toMatch(/ARRAY_CONTAINS\(r\["location"\], @location_(\d)*\)/);

            expect(params[0]).toMatchObject({
                name: /@id_(\d)*/,
                value: "id010",
            });
            expect(params[1]).toMatchObject({
                name: /@lastName_(\d)*/,
                value: "Ban",
            });

            expect(params[2]).toMatchObject({
                name: /@location_(\d)*/,
                value: "New York",
            });
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
