"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.parse = void 0;
/**
 * class and interfaces represents WHERE expressions. e.g. count > 10, lastName != "Banks", CONTAINS(lastName, "an").
 */
const Condition_1 = require("./Condition");
const EXPRESSION_PATTERN = /(.+)\s(STARTSWITH|ENDSWITH|CONTAINS|ARRAY_CONTAINS|LIKE|=|!=|<|<=|>|>=)\s*$/;
const BINARY_OPERATOR_PATTERN = /^\s*(LIKE|IN|=|!=|<|<=|>|>=)\s*$/;
exports.parse = (key, value) => {
    const match = EXPRESSION_PATTERN.exec(key);
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
    else {
        const exp = new SimpleExpression(key, value);
        // special case for {"lastName%" : "Banks"}
        // we recommend {"lastName LIKE" : "%Banks"}, but leave this for backwards compatibility.
        if (key.match(/.+%$/)) {
            exp.key = key.replace("%", "");
            exp.operator = "STARTSWITH";
            exp.type = "BINARY_FUNCTION";
        }
        return exp;
    }
};
class SimpleExpression {
    constructor(key, value) {
        this.type = "BINARY_OPERATOR";
        this.operator = "=";
        this.key = key;
        this.value = value;
    }
    toFilterResult() {
        const result = { queries: [], params: [] };
        const paramName = `@${this.key.replace(/[.%]/g, "__")}`;
        const k = Condition_1._formatKey(this.key);
        const v = this.value;
        if (Array.isArray(v)) {
            // ex. filter: '{"id":["ID001", "ID002"]}'
            result.queries.push(`ARRAY_CONTAINS(${paramName}, ${k})`);
        }
        else {
            if (this.type === "BINARY_OPERATOR") {
                result.queries.push(`${k} ${this.operator} ${paramName}`);
            }
            else {
                result.queries.push(`${this.operator}(${k}, ${paramName})`);
            }
        }
        result.params.push({ name: paramName, value: v });
        return result;
    }
}
exports.SimpleExpression = SimpleExpression;
//# sourceMappingURL=Expression.js.map