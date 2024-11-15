import { Document, Filter, Sort } from "mongodb";
import { Json, JsonObject } from "../../../condition/Condition";
/**
 * An util class to convert condition's filter/sort/limit/offset to bson filter/sort/limit/offset for mongo
 */
declare class ConditionUtil {
    static readonly binaryOperators: string[];
    static readonly OPERATOR_MAPPINGS: Record<string, string>;
    /**
     * a regex to match binary expressions(e.g. "id LIKE" or "tags ARRAY_CONTAINS")
     */
    static readonly simpleExpressionPattern: RegExp;
    /**
     * a regex to match binary sub query expressions(e.g. "tags ARRAY_CONTAINS_ANY id" or "tags ARRAY_CONTAINS_ALL name")
     */
    static readonly subQueryExpressionPattern: RegExp;
    /**
     * Convert condition's map filter to MongoDB BSON filter
     */
    static toBsonFilter(map?: JsonObject): Filter<Document>;
    /**
     * Convert single key-value pair to a BSON filter
     */
    private static toBsonFilterForKey;
    /**
     * Generate a BSON expression based on field, operator, and value
     */
    static generateExpression(field: string, operator: string, value: Json): Filter<Document> | null;
    /**
     * Generates an expression that performs a query like {"children ARRAY_CONTAINS_ANY grade" : [5, 8]}
     *
     * @param joinKey - e.g. 'children'
     * @param operator - e.g. 'ARRAY_CONTAINS_ANY'
     * @param filterKey - e.g. 'grade'
     * @param value - The value or array of values to match
     * @returns A MongoDB filter expression in BSON format
     */
    static generateExpression4SubQuery(joinKey: string, operator: string, filterKey: string, value: Json): Filter<Document> | null;
    /**
     * Utility method to convert SQL LIKE syntax to MongoDB regex
     */
    static convertToRegex(value: Json): RegExp;
    /**
     * Escape regex special characters in a string
     */
    static escapeRegex(value: Json): string;
    /**
     * Convert sort array to MongoDB sort object
     */
    static toBsonSort(sort?: string[]): Sort;
    /**
     * Process fields to ensure they are valid MongoDB field names
     */
    static processFields(fields: Set<string>): string[];
}
export { ConditionUtil };
//# sourceMappingURL=ConditionUtil.d.ts.map