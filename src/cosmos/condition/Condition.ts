import { SqlQuerySpec } from "@azure/cosmos";
import { parse } from "./Expression";

// A type for json
export type Json = null | boolean | number | string | JsonArray | JsonObject;

export type JsonArray = Array<Json>;

export interface JsonObject {
    [key: string]: Json;
}

/**
 * Condition for find. (e.g. filter / sort / offset / limit / fields)
 */
export interface Condition {
    filter?: JsonObject;
    sort?: [string, string];
    offset?: number;
    limit?: number;
    fields?: string[];
}

/**
 * Default find limit to protect db. override this by setting condition.limit explicitly.
 */
export const DEFAULT_LIMIT = 100;

/**
 * User defined type guard for JsonObject
 * @param json
 */
export const isJsonObject = (json: Json | undefined): json is JsonObject => {
    return (
        json !== undefined &&
        json !== null &&
        typeof json !== "boolean" &&
        typeof json !== "number" &&
        typeof json !== "string" &&
        !Array.isArray(json)
    );
};

/**
 * convert condition to a querySpec (SQL and params)
 * @param condition
 */
export const toQuerySpec = (condition: Condition, countOnly?: boolean): SqlQuerySpec => {
    const { filter: _filter, sort = [], offset } = condition;
    let { limit } = condition;

    //TODO fields
    const fields = countOnly ? "COUNT(1)" : "*";

    // filters
    const { queries, params } = _generateFilter(_filter);

    let queryText = [`SELECT  ${fields} FROM root r`, queries.join(" AND ")]
        .filter((s) => s)
        .join(" WHERE ");

    // sort
    if (!countOnly && sort) {
        // r.name
        const order = sort.length ? " ORDER BY " + _formatKey(sort[0]) : "";
        // ASC
        const order2 = sort.length > 1 ? ` ${sort[1]}` : "";

        queryText += order + order2;
    }

    // offset and limit
    if (!countOnly) {
        //default limit is 100 to protect db
        limit = limit || DEFAULT_LIMIT;
        // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-sql-query#OffsetLimitClause
        const OFFSET = offset !== undefined ? ` OFFSET ${offset}` : " OFFSET 0";
        const LIMIT = limit !== undefined ? ` LIMIT ${limit}` : "";

        queryText = queryText + OFFSET + LIMIT;
    }

    const querySpec: SqlQuerySpec = {
        query: queryText,
        parameters: params,
    };

    console.info("querySpec:", querySpec);

    return querySpec;
};

export type FilterResult = {
    queries: string[];
    params: { name: string; value: Json }[];
};

/**
 * generate query text and params for filter part.
 * @param _filter
 */
export const _generateFilter = (_filter: JsonObject | undefined): FilterResult => {
    // undefined filter
    if (!_filter) {
        return { queries: [], params: [] };
    }
    // normalize the filter
    const filter = _flatten(_filter);

    // process binary expressions {"count >": 10, "lastName !=": "Banks", "firstName CONTAINS"}

    let queries: string[] = [];
    let params: { name: string; value: Json }[] = [];

    Object.keys(filter).forEach((k) => {
        const exp = parse(k, filter[k]);
        const { queries: expQueries, params: expParams } = exp.toFilterResult();
        queries = queries.concat(expQueries);
        params = params.concat(expParams);
    });

    return { queries, params };
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
export const _flatten = (
    obj?: JsonObject,
    result: JsonObject = {},
    keys: string[] = [],
): JsonObject => {
    if (!obj) {
        return {};
    }

    Object.keys(obj).forEach((k) => {
        keys.push(k);
        const childObj = obj[k];
        if (isJsonObject(childObj)) {
            _flatten(childObj, result, keys);
        } else if (childObj !== undefined) {
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
export const _formatKey = (key: string): string => {
    return key
        .split(".")
        .reduce(
            (r, f) => {
                r.push(`["${f}"]`);
                return r;
            },
            ["r"],
        )
        .join("");
};
