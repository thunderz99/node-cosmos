import { FilterResult, Json } from "./Condition";
export interface Expression {
    toFilterResult: () => FilterResult;
}
export declare const EXPRESSION_PATTERN: RegExp;
export declare const SUB_QUERY_EXPRESSION_PATTERN: RegExp;
export declare const parse: (key: string, value: Json) => Expression;
export declare class SimpleExpression implements Expression {
    key: string;
    value: Json;
    type: "BINARY_OPERATOR" | "BINARY_FUNCTION";
    operator: string;
    constructor(key: string, value: Json);
    generateSuffix(): string;
    toFilterResult(): FilterResult;
}
//# sourceMappingURL=Expression.d.ts.map