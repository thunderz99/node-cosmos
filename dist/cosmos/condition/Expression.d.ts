/**
 * class and interfaces represents WHERE expressions. e.g. count > 10, lastName != "Banks", CONTAINS(lastName, "an").
 */
import { FilterResult, Json } from "./Condition";
export interface Expression {
    toFilterResult: () => FilterResult;
}
export declare const parse: (key: string, value: Json) => Expression;
export declare class SimpleExpression implements Expression {
    key: string;
    value: Json;
    type: "BINARY_OPERATOR" | "BINARY_FUNCTION";
    operator: string;
    constructor(key: string, value: Json);
    toFilterResult(): FilterResult;
}
//# sourceMappingURL=Expression.d.ts.map