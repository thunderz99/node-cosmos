import { SqlQuerySpec } from "@azure/cosmos";
export declare type Json = null | boolean | number | string | JsonArray | JsonObject;
export declare type JsonArray = Array<Json>;
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
export declare const DEFAULT_LIMIT = 100;
/**
 * User defined type guard for JsonObject
 * @param json
 */
export declare const isJsonObject: (json: Json | undefined) => json is JsonObject;
/**
 * convert condition to a querySpec (SQL and params)
 * @param condition
 */
export declare const toQuerySpec: (condition: Condition, countOnly?: boolean | undefined) => SqlQuerySpec;
export declare type FilterResult = {
    queries: string[];
    params: {
        name: string;
        value: Json;
    }[];
};
/**
 * generate query text and params for filter part.
 * @param _filter
 */
export declare const _generateFilter: (_filter: JsonObject | undefined) => FilterResult;
/**
 * flatten an object to a flat "obj1.key1.key2" format
 *
 * e.g. {obj1 : { key1 : { key2 : "test"}}} -> {obj1: {"key1.key2": "test"}}
 *
 * @param obj
 * @param result
 * @param keys
 */
export declare const _flatten: (obj?: JsonObject | undefined, result?: JsonObject, keys?: string[]) => JsonObject;
/**
 * Instead of c.key, return c["key"] or c["key1"]["key2"] for query. In order for cosmosdb reserved words
 * @param key
 */
export declare const _formatKey: (key: string) => string;
