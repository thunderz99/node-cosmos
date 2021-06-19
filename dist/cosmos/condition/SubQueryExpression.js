"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubQueryExpression = exports._buildArrayContainsAll = exports._buildArrayContainsAny = exports._buildSimpleSubQuery = void 0;
const Condition_1 = require("./Condition");
const assert_1 = require("../../util/assert");
const objects_1 = require("../../util/objects");
const ARRAY_CONTAINS_ANY = "ARRAY_CONTAINS_ANY";
const ARRAY_CONTAINS_ALL = "ARRAY_CONTAINS_ALL";
/**
 * A helper function to generate simple subquery text
 * @param joinKey
 * @param filterKey
 * @param paramName
 * @returns
 */
exports._buildSimpleSubQuery = (joinKey, filterKey, paramName) => {
    return `EXISTS(SELECT VALUE x FROM x IN ${Condition_1._formatKey(joinKey)} WHERE ${Condition_1._formatKey(filterKey, "x")} = ${paramName})`;
};
/**
 * A helper function to generate c.items ARRAY_CONTAINS_ANY List.of(item1, item2) queryText
 *
 * <pre>
 * INPUT: "items", "", "@items_009", ["id001", "id002", "id005"], params
 * OUTPUT:
 * " (EXISTS(SELECT VALUE x FROM x IN c["items"] WHERE ARRAY_CONTAINS(@items_009, x)))"
 *
 *
 * INPUT: "items", "id", "@items_id_010", ["id001", "id002", "id005"], params
 * OUTPUT:
 * " (EXISTS(SELECT VALUE x FROM x IN c["items"] WHERE ARRAY_CONTAINS(@id_010, x["id"])))"
 *
 *  and add paramsValue into params
 * </pre>
 */
exports._buildArrayContainsAny = (joinKey, filterKey, paramName, paramValue) => {
    assert_1.assertNotEmpty(joinKey, "joinKey");
    assert_1.assertIsDefined(filterKey, "filterKey");
    assert_1.assertNotEmpty(paramName, "paramName");
    const filterResult = { queries: [], params: [] };
    filterResult.params.push({ name: paramName, value: paramValue });
    if (objects_1.isArray(paramValue)) {
        //collection
        filterResult.queries.push(` (EXISTS(SELECT VALUE x FROM x IN ${Condition_1._formatKey(joinKey)} WHERE ARRAY_CONTAINS(${paramName}, ${Condition_1._formatKey(filterKey, "x")})))`);
    }
    else {
        //scalar
        filterResult.queries.push(` (${exports._buildSimpleSubQuery(joinKey, filterKey, paramName)})`);
    }
    return filterResult;
};
exports._buildArrayContainsAll = (joinKey, filterKey, paramName, paramValue) => {
    assert_1.assertNotEmpty(joinKey, "joinKey");
    assert_1.assertIsDefined(filterKey, "filterKey");
    assert_1.assertNotEmpty(paramName, "paramName");
    const filterResult = { queries: [], params: [] };
    if (Array.isArray(paramValue)) {
        let index = 0;
        const subQueries = [];
        for (const value of paramValue) {
            const subParamName = `${paramName}__${index}`;
            filterResult.params.push({ name: subParamName, value });
            subQueries.push(exports._buildSimpleSubQuery(joinKey, filterKey, subParamName));
            index++;
        }
        // AND all subQueies
        filterResult.queries.push(` (${subQueries.join(" AND ")})`);
    }
    else {
        //scalar
        filterResult.params.push({ name: paramName, value: paramValue });
        filterResult.queries.push(` (${exports._buildSimpleSubQuery(joinKey, filterKey, paramName)})`);
    }
    return filterResult;
};
class SubQueryExpression {
    constructor(joinKey, filterKey, value, operator = "=") {
        this.joinKey = joinKey;
        this.filterKey = filterKey;
        this.value = value;
        this.operator = operator;
    }
    toFilterResult() {
        // joinKey.filterKey -> fullName.last -> @param001_fullName__last
        const key = [this.joinKey, this.filterKey].filter(objects_1.notEmptyString).join(".");
        const paramName = `@${key.replace(/[.%]/g, "__")}`;
        const value = this.value;
        if (ARRAY_CONTAINS_ALL === this.operator) {
            return exports._buildArrayContainsAll(this.joinKey, this.filterKey, paramName, value);
        }
        if (ARRAY_CONTAINS_ANY === this.operator) {
            return exports._buildArrayContainsAny(this.joinKey, this.filterKey, paramName, value);
        }
        // if operator does not match above ones, return empty result
        return { queries: [], params: [] };
    }
}
exports.SubQueryExpression = SubQueryExpression;
//# sourceMappingURL=SubQueryExpression.js.map