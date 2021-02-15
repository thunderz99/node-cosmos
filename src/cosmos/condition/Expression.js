"use strict";
exports.__esModule = true;
exports.SimpleExpression = exports.parse = void 0;
/**
 * class and interfaces represents WHERE expressions. e.g. count > 10, lastName != "Banks", CONTAINS(lastName, "an").
 */
var Condition_1 = require("./Condition");
var EXPRESSION_PATTERN = /(.+)\s(STARTSWITH|ENDSWITH|CONTAINS|ARRAY_CONTAINS|=|!=|<|<=|>|>=)\s*$/;
exports.parse = function (key, value) {
    var match = EXPRESSION_PATTERN.exec(key);
    // if filter contains expression
    if (match) {
        // count > 10, get "count" part
        var newKey = match[1] || key;
        var exp = new SimpleExpression(newKey, value);
        // get ">" part
        exp.operator = match[2] || "=";
        exp.type = /\w+/.test(exp.operator) ? "BINARY_FUNCTION" : "BINARY_OPERATOR";
        return exp;
    }
    else {
        var exp = new SimpleExpression(key, value);
        // special case for {"lastName%" : "Banks"}
        if (key.match(/.+%$/)) {
            exp.key = key.replace("%", "");
            exp.operator = "STARTSWITH";
            exp.type = "BINARY_FUNCTION";
        }
        return exp;
    }
};
var SimpleExpression = /** @class */ (function () {
    function SimpleExpression(key, value) {
        this.type = "BINARY_OPERATOR";
        this.operator = "=";
        this.key = key;
        this.value = value;
    }
    SimpleExpression.prototype.toFilterResult = function () {
        var result = { queries: [], params: [] };
        var paramName = "@" + this.key.replace(/[.%]/g, "__");
        var k = Condition_1._formatKey(this.key);
        var v = this.value;
        if (Array.isArray(v)) {
            // ex. filter: '{"id":["ID001", "ID002"]}'
            result.queries.push("ARRAY_CONTAINS(" + paramName + ", " + k + ")");
        }
        else {
            if (this.type === "BINARY_OPERATOR") {
                result.queries.push(k + " " + this.operator + " " + paramName);
            }
            else {
                result.queries.push(this.operator + "(" + k + ", " + paramName + ")");
            }
        }
        result.params.push({ name: paramName, value: v });
        return result;
    };
    return SimpleExpression;
}());
exports.SimpleExpression = SimpleExpression;
