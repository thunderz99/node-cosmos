"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._flatten = exports.toQuerySpec = exports.isJsonObject = exports.DEFAULT_LIMIT = void 0;
/**
 * Default find limit to protect db. override this by setting condition.limit explicitly.
 */
exports.DEFAULT_LIMIT = 100;
/**
 * User defined type guard for JsonObject
 * @param json
 */
exports.isJsonObject = (json) => {
    return (json !== null &&
        typeof json !== "boolean" &&
        typeof json !== "number" &&
        typeof json !== "string");
};
/**
 * Convert to use reserved words. e.g: r.group -> r["group"]
 */
const _wrap = (k) => {
    return k
        .split(".")
        .map((i) => `["${i}"]`)
        .join("");
};
/**
 * convert condition to a querySpec (SQL and params)
 * @param condition
 */
exports.toQuerySpec = (condition, countOnly) => {
    const { filter: _filter, sort = [], offset } = condition;
    let { limit } = condition;
    //TODO fields
    const fields = countOnly ? "COUNT(1)" : "*";
    // normalize the filter
    const filter = exports._flatten(_filter);
    const query = [];
    const param = [];
    Object.keys(filter).forEach((k) => {
        const p = `@${k.replace(/[$.%]/g, "_")}`;
        let _k = k
            .split(".")
            .reduce((r, f) => {
            r.push(_wrap(f));
            return r;
        }, ["r"])
            .join("");
        if (Array.isArray(filter[k])) {
            // ex. filter: '{"id":["ID001", "ID002"]}'
            query.push(`ARRAY_CONTAINS(${p}, ${_k})`);
        }
        else {
            if (0 < _k.indexOf('%"')) {
                _k = _k.replace('%"', '"');
                query.push(`STARTSWITH(${_k}, ${p})`);
            }
            else {
                query.push(`${_k} = ${p}`);
            }
        }
        param.push({ name: p, value: filter[k] });
    });
    let queryText = [`SELECT  ${fields} FROM root r`, query.join(" AND ")]
        .filter((s) => s)
        .join(" WHERE ");
    if (!countOnly && sort) {
        // r.name
        const order = sort.length ? " ORDER BY " + `r${_wrap(sort[0])}` : "";
        // ASC
        const order2 = sort.length > 1 ? ` ${sort[1]}` : "";
        queryText += order + order2;
    }
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
        parameters: param,
    };
    console.info("querySpec:", querySpec);
    return querySpec;
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
exports._flatten = (obj, result = {}, keys = []) => {
    if (!obj) {
        return {};
    }
    Object.keys(obj).forEach((k) => {
        keys.push(k);
        const childObj = obj[k];
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
//# sourceMappingURL=Condition.js.map