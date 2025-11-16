import { Condition, DEFAULT_LIMIT, Json, JsonObject, _flatten } from "../../condition/Condition";
import { SUB_QUERY_EXPRESSION_PATTERN } from "../../condition/Expression";

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
const subQueryExpressionPattern = new RegExp(SUB_QUERY_EXPRESSION_PATTERN, "i");

export type QueryComponents = {
    whereClause: string;
    orderClause: string;
    limitClause: string;
    params: unknown[];
};

export class PostgresConditionBuilder {
    private readonly alias: string;
    private readonly params: unknown[] = [];
    private aliasCounter = 0;

    constructor(alias = "t") {
        this.alias = alias;
    }

    build(condition: Condition, countOnly = false): QueryComponents {
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

    private buildWhereClause(filter?: JsonObject): string {
        const clauses: string[] = [];
        const flattened = _flatten(filter);

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

    private buildOrderClause(sort: string[] = []): string {
        if (!sort.length) {
            return "";
        }

        const orderings: string[] = [];
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

    private buildLimitClause(condition: Condition): string {
        const limit = condition.limit ?? DEFAULT_LIMIT;
        const offset = condition.offset ?? 0;
        return `LIMIT ${limit} OFFSET ${offset}`;
    }

    private buildClause(rawKey: string, value: Json): string | null {
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
            const nestedPath = subQueryMatch[3]?.trim();
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

    private buildSimpleClause(field: string, operator: string, value: Json): string | null {
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

    private buildArrayClause(
        field: string,
        operator: string,
        value: Json,
        nestedPath?: string,
    ): string | null {
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

    private buildArrayAnyClause(field: string, values: Json[], pathParts: string[]): string {
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

    private buildArrayAllClause(field: string, values: Json[], pathParts: string[]): string {
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

    private jsonTextAccessor(field: string): string {
        const parts = this.splitPath(field);
        if (!parts.length) {
            return `${this.alias}.data::text`;
        }

        const last = parts[parts.length - 1];
        const base = this.jsonAccessor(parts.slice(0, -1).join("."));
        return `${base}->>'${this.escapeSegment(last)}'`;
    }

    private jsonAccessor(field: string): string {
        const parts = this.splitPath(field);
        if (!parts.length) {
            return `${this.alias}.data`;
        }

        return parts.reduce((expr, segment) => {
            return `${expr}->'${this.escapeSegment(segment)}'`;
        }, `${this.alias}.data`);
    }

    private jsonArrayAccessor(field: string): string {
        return `COALESCE(${this.jsonAccessor(field)}, '[]'::jsonb)`;
    }

    private jsonElementTextAccessor(alias: string, pathParts: string[]): string {
        if (!pathParts.length) {
            return `${alias}.value::text`;
        }

        const last = pathParts[pathParts.length - 1];
        const base = pathParts
            .slice(0, -1)
            .reduce((expr, segment) => `${expr}->'${this.escapeSegment(segment)}'`, `${alias}.value`);
        return `${base}->>'${this.escapeSegment(last)}'`;
    }

    private splitPath(field: string): string[] {
        return field.split(".").filter((segment) => segment);
    }

    private escapeSegment(segment: string): string {
        return segment.replace(/'/g, "''");
    }

    private addParam(value: unknown): string {
        this.params.push(value);
        return `$${this.params.length}`;
    }

    private nextAlias(prefix = "elem"): string {
        this.aliasCounter += 1;
        return `${prefix}_${this.aliasCounter}`;
    }

    private toTextValue(value: Json): string {
        if (typeof value === "string") {
            return value;
        }
        if (typeof value === "number" || typeof value === "boolean") {
            return value.toString();
        }
        return JSON.stringify(value);
    }

}
