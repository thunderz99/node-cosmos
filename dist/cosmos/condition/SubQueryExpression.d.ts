import { FilterResult, Json } from "./Condition";
import { Expression } from "./Expression";
/**
 * A helper function to generate simple subquery text
 * @param joinKey
 * @param filterKey
 * @param paramName
 * @returns
 */
export declare const _buildSimpleSubQuery: (joinKey: string, filterKey: string, paramName: string) => string;
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
export declare const _buildArrayContainsAny: (joinKey: string, filterKey: string, paramName: string, paramValue: Json) => FilterResult;
export declare const _buildArrayContainsAll: (joinKey: string, filterKey: string, paramName: string, paramValue: Json) => FilterResult;
export declare class SubQueryExpression implements Expression {
    joinKey: string;
    filterKey: string;
    value: Json;
    operator: string;
    constructor(joinKey: string, filterKey: string, value: Json, operator?: string);
    toFilterResult(): FilterResult;
}
//# sourceMappingURL=SubQueryExpression.d.ts.map