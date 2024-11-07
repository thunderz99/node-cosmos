"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.parse = exports.SUB_QUERY_EXPRESSION_PATTERN = exports.EXPRESSION_PATTERN = void 0;
const Condition_1 = require("./Condition");
const SubQueryExpression_1 = require("./SubQueryExpression");
/**
 * class and interfaces represents WHERE expressions. e.g. count > 10, lastName != "Banks", CONTAINS(lastName, "an").
 */
const randomstring_1 = __importDefault(require("randomstring"));
exports.EXPRESSION_PATTERN = /(.+)\s(STARTSWITH|ENDSWITH|CONTAINS|ARRAY_CONTAINS|LIKE|=|!=|<|<=|>|>=)\s*$/;
exports.SUB_QUERY_EXPRESSION_PATTERN = /(.+)\s(ARRAY_CONTAINS_ANY|ARRAY_CONTAINS_ALL)\s*(.*)$/;
const BINARY_OPERATOR_PATTERN = /^\s*(LIKE|IN|=|!=|<|<=|>|>=)\s*$/;
const parse = (key, value) => {
    let match = exports.EXPRESSION_PATTERN.exec(key);
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
    match = exports.SUB_QUERY_EXPRESSION_PATTERN.exec(key);
    if (match) {
        const joinKey = match[1];
        const filterKey = match[3];
        const operator = match[2];
        return new SubQueryExpression_1.SubQueryExpression(joinKey, filterKey, value, operator);
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
exports.parse = parse;
class SimpleExpression {
    constructor(key, value) {
        this.type = "BINARY_OPERATOR";
        this.operator = "=";
        this.key = key;
        this.value = value;
    }
    generateSuffix() {
        return randomstring_1.default.generate(7);
    }
    toFilterResult() {
        const result = { queries: [], params: [] };
        const paramName = `@${this.key.replace(/[.%]/g, "__")}_${this.generateSuffix()}`;
        const k = (0, Condition_1._formatKey)(this.key);
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