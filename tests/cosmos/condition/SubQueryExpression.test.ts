import {
    SubQueryExpression,
    _buildArrayContainsAll,
    _buildArrayContainsAny,
} from "../../../src/cosmos/condition/SubQueryExpression";

describe("Condition Test", () => {
    it("buildArrayContainsAny_should_work", () => {
        {
            /**
             * INPUT: "items", "", "@items_009", ["id001", "id002", "id005"]
             * OUTPUT:
             * " (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE ARRAY_CONTAINS(@items_009, x)))"
             *
             */
            const ret = _buildArrayContainsAny("items", "", "@items_009", [
                "id001",
                "id002",
                "id005",
            ]);
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE ARRAY_CONTAINS(@items_009, x)))',
            );

            expect(ret.params.length).toEqual(1);
            const param = ret.params[0];
            expect(param).toEqual({ name: "@items_009", value: ["id001", "id002", "id005"] });
        }
        {
            /**
             * INPUT: "items", "id", "@items_id_010", ["id001", "id002", "id005"]
             * OUTPUT:
             * " (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE ARRAY_CONTAINS(@items_id_010, x["id"])))"
             */
            const ret = _buildArrayContainsAny("items", "id", "@items_id_010", [
                "id001",
                "id002",
                "id005",
            ]);
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE ARRAY_CONTAINS(@items_id_010, x["id"])))',
            );

            expect(ret.params.length).toEqual(1);
            const param = ret.params[0];
            expect(param).toEqual({ name: "@items_id_010", value: ["id001", "id002", "id005"] });
        }
        {
            /**
             * INPUT: "items", "name", "@items_name_010", "react"
             */
            const ret = _buildArrayContainsAny("items", "name", "@items_name_010", "react");
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE x["name"] = @items_name_010))',
            );

            expect(ret.params.length).toEqual(1);
            const param = ret.params[0];
            expect(param).toEqual({ name: "@items_name_010", value: "react" });
        }
    });

    it("buildArrayContainsAll_should_work", () => {
        {
            /**
             * INPUT: "items", "", "@items_009", ["id001", "id002", "id005"]
             */
            const ret = _buildArrayContainsAll("items", "", "@items_009", ["id001", "id002"]);
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE x = @items_009__0) AND EXISTS(SELECT VALUE x FROM x IN r["items"] WHERE x = @items_009__1))',
            );

            expect(ret.params.length).toEqual(2);
            expect(ret.params[0]).toEqual({ name: "@items_009__0", value: "id001" });
            expect(ret.params[1]).toEqual({ name: "@items_009__1", value: "id002" });
        }
        {
            /**
             * INPUT: "tags", "name", "@param001_tags__name", ["react", "java"]
             */
            const ret = _buildArrayContainsAll("tags", "name", "@param001_tags__name", [
                "react",
                "java",
            ]);
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE x["name"] = @param001_tags__name__0) AND EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE x["name"] = @param001_tags__name__1))',
            );

            expect(ret.params.length).toEqual(2);
            expect(ret.params[0]).toEqual({ name: "@param001_tags__name__0", value: "react" });
            expect(ret.params[1]).toEqual({ name: "@param001_tags__name__1", value: "java" });
        }
        {
            /**
             * INPUT: "tags", "name", "@param001_tags__name", "react", params
             */
            const ret = _buildArrayContainsAll("tags", "name", "@param001_tags__name", "react");
            expect(ret.queries[0]).toEqual(
                ' (EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE x["name"] = @param001_tags__name))',
            );

            expect(ret.params.length).toEqual(1);
            expect(ret.params[0]).toEqual({ name: "@param001_tags__name", value: "react" });
        }
    });

    it("toFilterParam_should_work", () => {
        {
            {
                //ARRAY_CONTAINS_ANY
                const exp = new SubQueryExpression(
                    "tags",
                    "name",
                    ["react", "java"],
                    "ARRAY_CONTAINS_ANY",
                );
                const filterResult = exp.toFilterResult();

                expect(filterResult.queries[0]).toEqual(
                    ' (EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE ARRAY_CONTAINS(@tags__name, x["name"])))',
                );
                expect(filterResult.params.length).toEqual(1);
                expect(filterResult.params[0]).toEqual({
                    name: "@tags__name",
                    value: ["react", "java"],
                });
            }
        }
        {
            {
                //ARRAY_CONTAINS_ALL
                const exp = new SubQueryExpression(
                    "tags",
                    "name",
                    ["react", "java"],
                    "ARRAY_CONTAINS_ALL",
                );
                const filterResult = exp.toFilterResult();

                expect(filterResult.queries[0]).toEqual(
                    ' (EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE x["name"] = @tags__name__0) AND EXISTS(SELECT VALUE x FROM x IN r["tags"] WHERE x["name"] = @tags__name__1))',
                );
                expect(filterResult.params.length).toEqual(2);
                expect(filterResult.params[0]).toEqual({
                    name: "@tags__name__0",
                    value: "react",
                });
                expect(filterResult.params[1]).toEqual({
                    name: "@tags__name__1",
                    value: "java",
                });
            }
        }
    });
});
