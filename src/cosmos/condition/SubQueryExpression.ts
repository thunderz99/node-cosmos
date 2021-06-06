import { FilterResult, Json, _formatKey } from "./Condition";
import { assertIsDefined, assertNotEmpty } from "../../util/assert";
import { isArray, notEmptyString } from "../../util/objects";

import { Expression } from "./Expression";

const ARRAY_CONTAINS_ANY = "ARRAY_CONTAINS_ANY";
const ARRAY_CONTAINS_ALL = "ARRAY_CONTAINS_ALL";

/**
 * A helper function to generate simple subquery text
 * @param joinKey
 * @param filterKey
 * @param paramName
 * @returns
 */
export const _buildSimpleSubQuery = (
    joinKey: string,
    filterKey: string,
    paramName: string,
): string => {
    return `EXISTS(SELECT VALUE x FROM x IN ${_formatKey(joinKey)} WHERE ${_formatKey(
        filterKey,
        "x",
    )} = ${paramName})`;
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
export const _buildArrayContainsAny = (
    joinKey: string,
    filterKey: string,
    paramName: string,
    paramValue: Json,
): FilterResult => {
    assertNotEmpty(joinKey, "joinKey");
    assertIsDefined(filterKey, "filterKey");
    assertNotEmpty(paramName, "paramName");

    const filterResult: FilterResult = { queries: [], params: [] };

    filterResult.params.push({ name: paramName, value: paramValue });

    if (isArray(paramValue)) {
        //collection
        filterResult.queries.push(
            ` (EXISTS(SELECT VALUE x FROM x IN ${_formatKey(
                joinKey,
            )} WHERE ARRAY_CONTAINS(${paramName}, ${_formatKey(filterKey, "x")})))`,
        );
    } else {
        //scalar
        filterResult.queries.push(` (${_buildSimpleSubQuery(joinKey, filterKey, paramName)})`);
    }

    return filterResult;
};

export const _buildArrayContainsAll = (
    joinKey: string,
    filterKey: string,
    paramName: string,
    paramValue: Json,
): FilterResult => {
    assertNotEmpty(joinKey, "joinKey");
    assertIsDefined(filterKey, "filterKey");
    assertNotEmpty(paramName, "paramName");

    const filterResult: FilterResult = { queries: [], params: [] };

    if (Array.isArray(paramValue)) {
        let index = 0;
        const subQueries: string[] = [];

        for (const value of paramValue) {
            const subParamName = `${paramName}__${index}`;
            filterResult.params.push({ name: subParamName, value });
            subQueries.push(_buildSimpleSubQuery(joinKey, filterKey, subParamName));
            index++;
        }

        // AND all subQueies
        filterResult.queries.push(` (${subQueries.join(" AND ")})`);
    } else {
        //scalar
        filterResult.params.push({ name: paramName, value: paramValue });
        filterResult.queries.push(` (${_buildSimpleSubQuery(joinKey, filterKey, paramName)})`);
    }

    return filterResult;
};

export class SubQueryExpression implements Expression {
    joinKey: string;
    filterKey: string;
    value: Json;
    operator: string;

    constructor(joinKey: string, filterKey: string, value: Json, operator = "=") {
        this.joinKey = joinKey;
        this.filterKey = filterKey;
        this.value = value;
        this.operator = operator;
    }

    public toFilterResult(): FilterResult {
        // joinKey.filterKey -> fullName.last -> @param001_fullName__last
        const key = [this.joinKey, this.filterKey].filter(notEmptyString).join(".");

        const paramName = `@${key.replace(/[.%]/g, "__")}`;
        const value = this.value;

        if (ARRAY_CONTAINS_ALL === this.operator) {
            return _buildArrayContainsAll(this.joinKey, this.filterKey, paramName, value);
        }
        if (ARRAY_CONTAINS_ANY === this.operator) {
            return _buildArrayContainsAny(this.joinKey, this.filterKey, paramName, value);
        }

        // if operator does not match above ones, return empty result
        return { queries: [], params: [] };
    }
}
