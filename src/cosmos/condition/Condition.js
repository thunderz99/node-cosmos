"use strict";
exports.__esModule = true;
exports._formatKey = exports._flatten = exports._generateFilter = exports.toQuerySpec = exports.isJsonObject = exports.DEFAULT_LIMIT = void 0;
var Expression_1 = require("./Expression");
/**
 * Default find limit to protect db. override this by setting condition.limit explicitly.
 */
exports.DEFAULT_LIMIT = 100;
/**
 * User defined type guard for JsonObject
 * @param json
 */
exports.isJsonObject = function (json) {
    return (json !== undefined &&
        json !== null &&
        typeof json !== "boolean" &&
        typeof json !== "number" &&
        typeof json !== "string" &&
        !Array.isArray(json));
};
/**
 * convert condition to a querySpec (SQL and params)
 * @param condition
 */
exports.toQuerySpec = function (condition, countOnly) {
    var _filter = condition.filter, _a = condition.sort, sort = _a === void 0 ? [] : _a, offset = condition.offset;
    var limit = condition.limit;
    //TODO fields
    var fields = countOnly ? "COUNT(1)" : "*";
    // filters
    var _b = exports._generateFilter(_filter), queries = _b.queries, params = _b.params;
    var queryText = ["SELECT  " + fields + " FROM root r", queries.join(" AND ")]
        .filter(function (s) { return s; })
        .join(" WHERE ");
    // sort
    if (!countOnly && sort) {
        // r.name
        var order = sort.length ? " ORDER BY " + exports._formatKey(sort[0]) : "";
        // ASC
        var order2 = sort.length > 1 ? " " + sort[1] : "";
        queryText += order + order2;
    }
    // offset and limit
    if (!countOnly) {
        //default limit is 100 to protect db
        limit = limit || exports.DEFAULT_LIMIT;
        // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-sql-query#OffsetLimitClause
        var OFFSET = offset !== undefined ? " OFFSET " + offset : " OFFSET 0";
        var LIMIT = limit !== undefined ? " LIMIT " + limit : "";
        queryText = queryText + OFFSET + LIMIT;
    }
    var querySpec = {
        query: queryText,
        parameters: params
    };
    console.info("querySpec:", querySpec);
    return querySpec;
};
/**
 * generate query text and params for filter part.
 * @param _filter
 */
exports._generateFilter = function (_filter) {
    // undefined filter
    if (!_filter) {
        return { queries: [], params: [] };
    }
    // normalize the filter
    var filter = exports._flatten(_filter);
    // process binary expressions {"count >": 10, "lastName !=": "Banks", "firstName CONTAINS"}
    var queries = [];
    var params = [];
    Object.keys(filter).forEach(function (k) {
        var exp = Expression_1.parse(k, filter[k]);
        var _a = exp.toFilterResult(), expQueries = _a.queries, expParams = _a.params;
        queries = queries.concat(expQueries);
        params = params.concat(expParams);
    });
    return { queries: queries, params: params };
};
/**
 * flatten an object to a flat "obj1.key1.key2" format
 *
 * e.g. {obj1 : { key1 : { key2 : "test"}}} -> {obj1: {"key1.key2": "test"}}
 *
 * @param obj
 * @param result
 * @param keys
 */
exports._flatten = function (obj, result, keys) {
    if (result === void 0) { result = {}; }
    if (keys === void 0) { keys = []; }
    if (!obj) {
        return {};
    }
    Object.keys(obj).forEach(function (k) {
        keys.push(k);
        var childObj = obj[k];
        if (exports.isJsonObject(childObj)) {
            exports._flatten(childObj, result, keys);
        }
        else if (childObj !== undefined) {
            result[keys.join(".")] = obj[k];
        }
        keys.pop();
    });
    return result;
};
/**
 * Instead of c.key, return c["key"] or c["key1"]["key2"] for query. In order for cosmosdb reserved words
 * @param key
 */
exports._formatKey = function (key) {
    return key
        .split(".")
        .reduce(function (r, f) {
        r.push("[\"" + f + "\"]");
        return r;
    }, ["r"])
        .join("");
};
