"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._formatKey = exports._flatten = exports._generateFilter = exports.toQuerySpec = exports.isJsonObject = exports.DEFAULT_LIMIT = void 0;
const assert_1 = require("../../util/assert");
const Expression_1 = require("./Expression");
/**
 * Default find limit to protect db. override this by setting condition.limit explicitly.
 */
exports.DEFAULT_LIMIT = 100;
/**
 * User defined type guard for JsonObject
 * @param json
 */
const isJsonObject = (json) => {
    return (json !== undefined &&
        json !== null &&
        typeof json !== "boolean" &&
        typeof json !== "number" &&
        typeof json !== "string" &&
        !Array.isArray(json));
};
exports.isJsonObject = isJsonObject;
/**
 * convert condition to a querySpec (SQL and params)
 * @param condition
 */
const toQuerySpec = (condition, countOnly) => {
    const { filter: _filter, sort = [], offset } = condition;
    let { limit } = condition;
    //TODO fields
    const fields = countOnly ? "COUNT(1)" : "*";
    // filters
    const { queries, params } = (0, exports._generateFilter)(_filter);
    let queryText = [`SELECT  ${fields} FROM root r`, queries.join(" AND ")]
        .filter((s) => s)
        .join(" WHERE ");
    // sort
    if (!countOnly && sort) {
        // r.name
        const order = sort.length ? " ORDER BY " + (0, exports._formatKey)(sort[0]) : "";
        // ASC
        const order2 = sort.length > 1 ? ` ${sort[1]}` : "";
        queryText += order + order2;
    }
    // offset and limit
    if (!countOnly) {
        //default limit is 100 to protect db
        limit = limit || exports.DEFAULT_LIMIT;
        // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-sql-query#OffsetLimitClause
        const OFFSET = offset !== undefined ? ` OFFSET ${offset}` : " OFFSET 0";
        const LIMIT = limit !== undefined ? ` LIMIT ${limit}` : "";
        queryText = queryText + OFFSET + LIMIT;
    }
    const querySpec = {
        query: queryText,
        parameters: params,
    };
    console.info("querySpec:", querySpec);
    return querySpec;
};
exports.toQuerySpec = toQuerySpec;
/**
 * generate query text and params for filter part.
 *
 * e.g. {"count >": 10} -> {queries: ["count > @count_xxx"], params: [{name: "@count_xxx", value: 10}]}
 *
 * @param _filter
 */
const _generateFilter = (_filter) => {
    // undefined filter
    if (!_filter) {
        return { queries: [], params: [] };
    }
    // normalize the filter
    const filter = (0, exports._flatten)(_filter);
    // process binary expressions {"count >": 10, "lastName !=": "Banks", "firstName CONTAINS"}
    let queries = [];
    let params = [];
    Object.keys(filter).forEach((k) => {
        const exp = (0, Expression_1.parse)(k, filter[k]);
        const { queries: expQueries, params: expParams } = exp.toFilterResult();
        queries = queries.concat(expQueries);
        params = params.concat(expParams);
    });
    return { queries, params };
};
exports._generateFilter = _generateFilter;
/**
 * flatten an object to a flat "obj1.key1.key2" format
 *
 * e.g. {obj1 : { key1 : { key2 : "test"}}} -> {obj1: {"key1.key2": "test"}}
 *
 * @param obj
 * @param result
 * @param keys
 */
const _flatten = (obj, result = {}, keys = []) => {
    if (!obj) {
        return {};
    }
    Object.keys(obj).forEach((k) => {
        keys.push(k);
        const childObj = obj[k];
        if ((0, exports.isJsonObject)(childObj)) {
            (0, exports._flatten)(childObj, result, keys);
        }
        else if (childObj !== undefined) {
            result[keys.join(".")] = obj[k];
        }
        keys.pop();
    });
    return result;
};
exports._flatten = _flatten;
/**
 * Instead of c.key, return c["key"] or c["key1"]["key2"] for query. In order for cosmosdb reserved words
 *
 * @param key filter's key
 * @param collectionAlias default to "c", can be "x" when using subquery for EXISTS or JOIN
 * @return formatted filter's key c["key1"]["key2"]
 */
const _formatKey = (key, collectionAlias = "r") => {
    (0, assert_1.assertNotEmpty)(collectionAlias, "collectionAlias");
    if (!key) {
        // return collectionAlias when key is empty
        return collectionAlias;
    }
    return key
        .split(".")
        .reduce((r, f) => {
        r.push(`["${f}"]`);
        return r;
    }, [collectionAlias])
        .join("");
};
exports._formatKey = _formatKey;
//# sourceMappingURL=Condition.js.map