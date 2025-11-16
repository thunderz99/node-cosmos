import { Condition } from "../../condition/Condition";
/** Structured result of the builder that feeds a SQL statement. */
export type QueryComponents = {
    whereClause: string;
    orderClause: string;
    limitClause: string;
    params: unknown[];
};
/**
 * Converts a generic Condition into SQL fragments and bind parameters
 * that operate against JSONB columns in PostgreSQL.
 */
export declare class PostgresConditionBuilder {
    /** Table alias used for all JSONB accessors. */
    private readonly alias;
    /** Parameter bag that mirrors `$1`, `$2`, ... placeholders. */
    private readonly params;
    /** Counter for generating deterministic sub-query aliases. */
    private aliasCounter;
    /**
     * @param alias Overrideable table alias, defaults to `t`.
     */
    constructor(alias?: string);
    /**
     * Builds WHERE/ORDER/LIMIT clauses for a Condition.
     * @param condition Filter/sort definition.
     * @param countOnly When true order & limit clauses are skipped.
     */
    build(condition: Condition, countOnly?: boolean): QueryComponents;
    /** Creates the WHERE clause from a flattened filter object. */
    private buildWhereClause;
    /** Generates ORDER BY clause from alternating field/direction tuples. */
    private buildOrderClause;
    /** Calculates LIMIT/OFFSET with defaults. */
    private buildLimitClause;
    /** Decides how a raw key/value pair should be rendered into SQL. */
    private buildClause;
    /** Builds predicates for scalar comparison operators. */
    private buildSimpleClause;
    /** Builds predicates for JSON arrays, including nested path variants. */
    private buildArrayClause;
    /** Emits EXISTS query that succeeds when any element matches. */
    private buildArrayAnyClause;
    /** Ensures every provided value is present within a JSON array. */
    private buildArrayAllClause;
    /** Provides a `->>` accessor for the final segment of the path. */
    private jsonTextAccessor;
    /** Provides a `->` chain accessor for nested JSONB traversal. */
    private jsonAccessor;
    /** Returns a JSON array accessor that defaults to empty array. */
    private jsonArrayAccessor;
    /** Accesses nested properties of an element retrieved via jsonb_array_elements. */
    private jsonElementTextAccessor;
    /** Splits dotted field paths into sanitized segments. */
    private splitPath;
    /** Escapes embedded quotes for safe use inside JSON path strings. */
    private escapeSegment;
    /** Adds a value to the parameter list and returns its placeholder token. */
    private addParam;
    /** Creates a unique alias for nested SQL fragments. */
    private nextAlias;
    /** Normalizes arbitrary JSON values into their textual representation. */
    private toTextValue;
}
//# sourceMappingURL=PostgresConditionBuilder.d.ts.map