"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresConditionBuilder = void 0;
const Condition_1 = require("../../condition/Condition");
const Expression_1 = require("../../condition/Expression");
const SIMPLE_OPERATORS = [
    "LIKE",
    "IN",
    "=",
    "!=",
    "<",
    "<=",
    ">",
    ">=",
    "STARTSWITH",
    "ENDSWITH",
    "CONTAINS",
];
const simpleExpressionPattern = new RegExp(`(.+?)\\s*(${SIMPLE_OPERATORS.join("|")})\\s*$`, "i");
const subQueryExpressionPattern = new RegExp(Expression_1.SUB_QUERY_EXPRESSION_PATTERN, "i");
class PostgresConditionBuilder {
    constructor(alias = "t") {
        this.params = [];
        this.aliasCounter = 0;
        this.alias = alias;
    }
    build(condition, countOnly = false) {
        const whereClause = this.buildWhereClause(condition.filter);
        const orderClause = countOnly ? "" : this.buildOrderClause(condition.sort);
        const limitClause = countOnly ? "" : this.buildLimitClause(condition);
        return {
            whereClause,
            orderClause,
            limitClause,
            params: this.params,
        };
    }
    buildWhereClause(filter) {
        const clauses = [];
        const flattened = (0, Condition_1._flatten)(filter);
        for (const [rawKey, value] of Object.entries(flattened)) {
            if (value === undefined) {
                continue;
            }
            const clause = this.buildClause(rawKey, value);
            if (clause) {
                clauses.push(clause);
            }
        }
        if (!clauses.length) {
            return "";
        }
        return `WHERE ${clauses.join(" AND ")}`;
    }
    buildOrderClause(sort = []) {
        if (!sort.length) {
            return "";
        }
        const orderings = [];
        for (let i = 0; i < sort.length; i += 2) {
            const field = sort[i];
            if (!field) {
                continue;
            }
            const direction = (sort[i + 1] || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
            orderings.push(`${this.jsonTextAccessor(field)} ${direction}`);
        }
        if (!orderings.length) {
            return "";
        }
        return `ORDER BY ${orderings.join(", ")}`;
    }
    buildLimitClause(condition) {
        var _a, _b;
        const limit = (_a = condition.limit) !== null && _a !== void 0 ? _a : Condition_1.DEFAULT_LIMIT;
        const offset = (_b = condition.offset) !== null && _b !== void 0 ? _b : 0;
        return `LIMIT ${limit} OFFSET ${offset}`;
    }
    buildClause(rawKey, value) {
        var _a;
        const simpleMatch = simpleExpressionPattern.exec(rawKey);
        if (simpleMatch) {
            const field = simpleMatch[1].trim();
            const operator = simpleMatch[2].toUpperCase().trim();
            return this.buildSimpleClause(field, operator, value);
        }
        const subQueryMatch = subQueryExpressionPattern.exec(rawKey);
        if (subQueryMatch) {
            const field = subQueryMatch[1].trim();
            const operator = subQueryMatch[2].toUpperCase().trim();
            const nestedPath = (_a = subQueryMatch[3]) === null || _a === void 0 ? void 0 : _a.trim();
            return this.buildArrayClause(field, operator, value, nestedPath);
        }
        if (rawKey.endsWith("%")) {
            const field = rawKey.slice(0, -1);
            return this.buildSimpleClause(field, "STARTSWITH", value);
        }
        if (Array.isArray(value)) {
            return this.buildSimpleClause(rawKey, "IN", value);
        }
        return this.buildSimpleClause(rawKey, "=", value);
    }
    buildSimpleClause(field, operator, value) {
        switch (operator) {
            case "=":
            case "!=": {
                const comparator = operator === "=" ? "=" : "!=";
                const accessor = this.jsonTextAccessor(field);
                const placeholder = this.addParam(this.toTextValue(value));
                return `${accessor} ${comparator} ${placeholder}`;
            }
            case ">":
            case ">=":
            case "<":
            case "<=": {
                const accessor = this.jsonTextAccessor(field);
                if (typeof value === "number") {
                    const placeholder = this.addParam(value);
                    return `(${accessor})::numeric ${operator} ${placeholder}`;
                }
                const placeholder = this.addParam(this.toTextValue(value));
                return `${accessor} ${operator} ${placeholder}`;
            }
            case "LIKE": {
                const accessor = this.jsonTextAccessor(field);
                const placeholder = this.addParam(String(value));
                return `${accessor} LIKE ${placeholder}`;
            }
            case "STARTSWITH": {
                const accessor = this.jsonTextAccessor(field);
                const placeholder = this.addParam(`${String(value)}%`);
                return `${accessor} LIKE ${placeholder}`;
            }
            case "ENDSWITH": {
                const accessor = this.jsonTextAccessor(field);
                const placeholder = this.addParam(`%${String(value)}`);
                return `${accessor} LIKE ${placeholder}`;
            }
            case "CONTAINS": {
                const accessor = this.jsonTextAccessor(field);
                const placeholder = this.addParam(`%${String(value)}%`);
                return `${accessor} LIKE ${placeholder}`;
            }
            case "IN": {
                const list = Array.isArray(value) ? value : [value];
                const placeholder = this.addParam(list.map((item) => this.toTextValue(item)));
                const accessor = this.jsonTextAccessor(field);
                return `${accessor} = ANY(${placeholder}::text[])`;
            }
            case "ARRAY_CONTAINS":
            case "ARRAY_CONTAINS_ANY":
            case "ARRAY_CONTAINS_ALL": {
                return this.buildArrayClause(field, operator, value);
            }
            default:
                return null;
        }
    }
    buildArrayClause(field, operator, value, nestedPath) {
        const values = Array.isArray(value) ? value : [value];
        const pathParts = nestedPath ? nestedPath.split(".").filter((segment) => segment) : [];
        if (operator === "ARRAY_CONTAINS" || operator === "ARRAY_CONTAINS_ANY") {
            return this.buildArrayAnyClause(field, values, pathParts);
        }
        if (operator === "ARRAY_CONTAINS_ALL") {
            return this.buildArrayAllClause(field, values, pathParts);
        }
        return null;
    }
    buildArrayAnyClause(field, values, pathParts) {
        const arrayExpr = this.jsonArrayAccessor(field);
        const placeholder = this.addParam(values.map((v) => this.toTextValue(v)));
        if (!pathParts.length) {
            const alias = this.nextAlias("elem");
            return `EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(${arrayExpr}) AS ${alias}(value)
                WHERE ${alias}.value = ANY(${placeholder}::text[])
            )`;
        }
        const alias = this.nextAlias("elem");
        const accessor = this.jsonElementTextAccessor(alias, pathParts);
        return `EXISTS (
            SELECT 1
            FROM jsonb_array_elements(${arrayExpr}) AS ${alias}(value)
            WHERE ${accessor} = ANY(${placeholder}::text[])
        )`;
    }
    buildArrayAllClause(field, values, pathParts) {
        const arrayExpr = this.jsonArrayAccessor(field);
        const placeholder = this.addParam(values.map((v) => this.toTextValue(v)));
        const requiredAlias = this.nextAlias("req");
        if (!pathParts.length) {
            const elemAlias = this.nextAlias("elem");
            return `NOT EXISTS (
                SELECT 1
                FROM unnest(${placeholder}::text[]) AS ${requiredAlias}(value)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(${arrayExpr}) AS ${elemAlias}(value)
                    WHERE ${elemAlias}.value = ${requiredAlias}.value
                )
            )`;
        }
        const elemAlias = this.nextAlias("elem");
        const accessor = this.jsonElementTextAccessor(elemAlias, pathParts);
        return `NOT EXISTS (
            SELECT 1
            FROM unnest(${placeholder}::text[]) AS ${requiredAlias}(value)
            WHERE NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(${arrayExpr}) AS ${elemAlias}(value)
                WHERE ${accessor} = ${requiredAlias}.value
            )
        )`;
    }
    jsonTextAccessor(field) {
        const parts = this.splitPath(field);
        if (!parts.length) {
            return `${this.alias}.data::text`;
        }
        const last = parts[parts.length - 1];
        const base = this.jsonAccessor(parts.slice(0, -1).join("."));
        return `${base}->>'${this.escapeSegment(last)}'`;
    }
    jsonAccessor(field) {
        const parts = this.splitPath(field);
        if (!parts.length) {
            return `${this.alias}.data`;
        }
        return parts.reduce((expr, segment) => {
            return `${expr}->'${this.escapeSegment(segment)}'`;
        }, `${this.alias}.data`);
    }
    jsonArrayAccessor(field) {
        return `COALESCE(${this.jsonAccessor(field)}, '[]'::jsonb)`;
    }
    jsonElementTextAccessor(alias, pathParts) {
        if (!pathParts.length) {
            return `${alias}.value::text`;
        }
        const last = pathParts[pathParts.length - 1];
        const base = pathParts
            .slice(0, -1)
            .reduce((expr, segment) => `${expr}->'${this.escapeSegment(segment)}'`, `${alias}.value`);
        return `${base}->>'${this.escapeSegment(last)}'`;
    }
    splitPath(field) {
        return field.split(".").filter((segment) => segment);
    }
    escapeSegment(segment) {
        return segment.replace(/'/g, "''");
    }
    addParam(value) {
        this.params.push(value);
        return `$${this.params.length}`;
    }
    nextAlias(prefix = "elem") {
        this.aliasCounter += 1;
        return `${prefix}_${this.aliasCounter}`;
    }
    toTextValue(value) {
        if (typeof value === "string") {
            return value;
        }
        if (typeof value === "number" || typeof value === "boolean") {
            return value.toString();
        }
        return JSON.stringify(value);
    }
}
exports.PostgresConditionBuilder = PostgresConditionBuilder;
//# sourceMappingURL=PostgresConditionBuilder.js.map