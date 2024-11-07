import { FilterResult, Json, _formatKey } from "./Condition";

import { SubQueryExpression } from "./SubQueryExpression";
/**
 * class and interfaces represents WHERE expressions. e.g. count > 10, lastName != "Banks", CONTAINS(lastName, "an").
 */
import randomstring from "randomstring";

export interface Expression {
    toFilterResult: () => FilterResult;
}

export const EXPRESSION_PATTERN = /(.+)\s(STARTSWITH|ENDSWITH|CONTAINS|ARRAY_CONTAINS|LIKE|=|!=|<|<=|>|>=)\s*$/;
export const SUB_QUERY_EXPRESSION_PATTERN = /(.+)\s(ARRAY_CONTAINS_ANY|ARRAY_CONTAINS_ALL)\s*(.*)$/;

const BINARY_OPERATOR_PATTERN = /^\s*(LIKE|IN|=|!=|<|<=|>|>=)\s*$/;

export const parse = (key: string, value: Json): Expression => {
    let match = EXPRESSION_PATTERN.exec(key);

    // if filter contains expression
    if (match) {
        // "count >": 10, get "count" part
        const newKey = match[1] || key;
        const exp = new SimpleExpression(newKey, value);

        // get ">" part
        exp.operator = match[2] || "=";
        exp.type = BINARY_OPERATOR_PATTERN.test(exp.operator)
            ? "BINARY_OPERATOR"
            : "BINARY_FUNCTION";
        return exp;
    }

    // if this is a subquery
    match = SUB_QUERY_EXPRESSION_PATTERN.exec(key);
    if (match) {
        const joinKey: string = match[1];
        const filterKey: string = match[3];
        const operator: string = match[2];
        return new SubQueryExpression(joinKey, filterKey, value, operator);
    }

    // finally the default key / value expression
    const exp = new SimpleExpression(key, value);

    // special case for {"lastName%" : "Banks"}
    // we recommend {"lastName LIKE" : "Banks%"}, but leave this for backwards compatibility.
    if (key.match(/.+%$/)) {
        exp.key = key.replace("%", "");
        exp.operator = "STARTSWITH";
        exp.type = "BINARY_FUNCTION";
    }
    return exp;
};

export class SimpleExpression implements Expression {
    key: string;
    value: Json;
    type: "BINARY_OPERATOR" | "BINARY_FUNCTION" = "BINARY_OPERATOR";
    operator = "=";

    constructor(key: string, value: Json) {
        this.key = key;
        this.value = value;
    }

    generateSuffix(): string {
        return randomstring.generate(7);
    }

    public toFilterResult(): FilterResult {
        const result: FilterResult = { queries: [], params: [] };

        const paramName = `@${this.key.replace(/[.%]/g, "__")}_${this.generateSuffix()}`;

        const k = _formatKey(this.key);
        const v = this.value;

        if (Array.isArray(v)) {
            // ex. filter: '{"id":["ID001", "ID002"]}'
            result.queries.push(`ARRAY_CONTAINS(${paramName}, ${k})`);
        } else {
            if (this.type === "BINARY_OPERATOR") {
                result.queries.push(`${k} ${this.operator} ${paramName}`);
            } else {
                result.queries.push(`${this.operator}(${k}, ${paramName})`);
            }
        }

        result.params.push({ name: paramName, value: v });

        return result;
    }
}
