"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionUtil = void 0;
const Expression_1 = require("../../../condition/Expression");
/**
 * An util class to convert condition's filter/sort/limit/offset to bson filter/sort/limit/offset for mongo
 */
class ConditionUtil {
    /**
     * Convert condition's map filter to MongoDB BSON filter
     */
    static toBsonFilter(map = {}) {
        const filters = [];
        for (const [key, value] of Object.entries(map)) {
            if (!key)
                continue;
            const filter = this.toBsonFilterForKey(key, value);
            if (filter)
                filters.push(filter);
        }
        return filters.length > 1 ? { $and: filters } : filters[0] || {};
    }
    /**
     * Convert single key-value pair to a BSON filter
     */
    static toBsonFilterForKey(key, value) {
        const match = this.simpleExpressionPattern.exec(key);
        if (match) {
            const field = match[1].trim();
            const operator = match[2].trim();
            return this.generateExpression(field, operator, value);
        }
        const subQueryMatch = this.subQueryExpressionPattern.exec(key);
        if (subQueryMatch) {
            const subQueryJoinKey = subQueryMatch[1].trim(); // children
            const operator = subQueryMatch[2].trim(); // ARRAY_CONTAINS_ANY
            const filterKey = subQueryMatch[3].trim(); // grade
            return this.generateExpression4SubQuery(subQueryJoinKey, operator, filterKey, value);
        }
        if (Array.isArray(value)) {
            // eg. filter: '{"id":["ID001", "ID002"]}'
            return { [key]: { $in: value } };
        }
        // special case for {"lastName%" : "Banks"}
        // we recommend {"lastName LIKE" : "Banks%"}, but leave this for backwards compatibility.
        if (key.match(/.+%$/)) {
            const field = key.replace("%", "");
            const operator = "STARTSWITH";
            return this.generateExpression(field, operator, value);
        }
        return { [key]: value };
    }
    /**
     * Generate a BSON expression based on field, operator, and value
     */
    static generateExpression(field, operator, value) {
        const mappedOperator = this.OPERATOR_MAPPINGS[operator] || operator;
        switch (mappedOperator) {
            case "$eq":
                return { [field]: { $eq: value } };
            case "$ne":
                return { [field]: { $ne: value } };
            case "$gte":
                return { [field]: { $gte: value } };
            case "$lte":
                return { [field]: { $lte: value } };
            case "$gt":
                return { [field]: { $gt: value } };
            case "$lt":
                return { [field]: { $lt: value } };
            case "LIKE":
                return { [field]: { $regex: this.convertToRegex(value) } };
            case "STARTSWITH":
                return { [field]: { $regex: `^${this.escapeRegex(value)}` } };
            case "ENDSWITH":
                return { [field]: { $regex: `${this.escapeRegex(value)}$` } };
            case "CONTAINS":
                return {
                    [field]: { $regex: `.*${this.escapeRegex(value)}.*` },
                };
            case "IS_DEFINED":
                return { [field]: { $exists: value === true } };
            case "IS_NULL":
                return value === true ? { [field]: null } : { [field]: { $ne: null } };
            case "IS_NUMBER":
                return {
                    [field]: { $type: value === true ? "number" : { $not: { $type: "number" } } },
                };
            case "ARRAY_CONTAINS":
                // simple key:value does the job
                // https://www.mongodb.com/docs/manual/tutorial/query-arrays/?msockid=07d12f08b23369f53c0f3b60b31168fe#query-an-array-for-an-element
                return {
                    [field]: value,
                };
            case "ARRAY_CONTAINS_ANY":
                // $in
                const arrayValue = Array.isArray(value) ? value : [value];
                return {
                    [field]: { $in: arrayValue },
                };
            case "ARRAY_CONTAINS_ALL":
                // $all
                return {
                    [field]: { $all: value },
                };
            case "IN":
                // $in
                return {
                    [field]: { $in: value },
                };
            default:
                return null;
        }
    }
    /**
     * Generates an expression that performs a query like {"children ARRAY_CONTAINS_ANY grade" : [5, 8]}
     *
     * @param joinKey - e.g. 'children'
     * @param operator - e.g. 'ARRAY_CONTAINS_ANY'
     * @param filterKey - e.g. 'grade'
     * @param value - The value or array of values to match
     * @returns A MongoDB filter expression in BSON format
     */
    static generateExpression4SubQuery(joinKey, operator, filterKey, value) {
        if (!filterKey) {
            // if just "children ARRAY_CONTAINS_ANY"
            // this is process by other method
            return null;
        }
        const collectionValue = Array.isArray(value) ? value : [value];
        let filter = null;
        if (operator === "ARRAY_CONTAINS_ANY") {
            // Equivalent to using `$elemMatch` with `$in`
            // Example query:
            // db.Families.find({
            //   children: {
            //     $elemMatch: { grade: { $in: [5, 8] } }
            //   }
            // });
            filter = {
                [joinKey]: {
                    $elemMatch: {
                        [filterKey]: { $in: collectionValue },
                    },
                },
            };
        }
        else {
            // "children ARRAY_CONTAINS_ALL grade"
            // Using `$all` with `$elemMatch` for each element
            // Example query:
            // db.Families.find({
            //   children: {
            //     $all: [
            //       { $elemMatch: { grade: 5 } },
            //       { $elemMatch: { grade: 8 } }
            //     ]
            //   }
            // })
            filter = {
                [joinKey]: {
                    $all: collectionValue.map((v) => ({
                        $elemMatch: { [filterKey]: v },
                    })),
                },
            };
        }
        return filter;
    }
    /**
     * Utility method to convert SQL LIKE syntax to MongoDB regex
     */
    static convertToRegex(value) {
        const convertedStr = _getStringValue(value);
        return new RegExp(convertedStr.replace(/%/g, ".*").replace(/_/g, "."));
    }
    /**
     * Escape regex special characters in a string
     */
    static escapeRegex(value) {
        const convertedStr = _getStringValue(value);
        return convertedStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    /**
     * Convert sort array to MongoDB sort object
     */
    static toBsonSort(sort = []) {
        const sortObject = {};
        for (let i = 0; i < sort.length; i += 2) {
            const field = sort[i];
            const order = (sort[i + 1] || "ASC").toUpperCase() === "DESC" ? -1 : 1;
            sortObject[field] = order;
        }
        return sortObject;
    }
    /**
     * Process fields to ensure they are valid MongoDB field names
     */
    static processFields(fields) {
        const fieldArray = [];
        for (const field of fields) {
            if (/[\{\},\"\'\s]/.test(field)) {
                throw new Error(`Invalid field name: ${field}`);
            }
            fieldArray.push(field);
        }
        return fieldArray;
    }
}
exports.ConditionUtil = ConditionUtil;
ConditionUtil.binaryOperators = [
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
    "RegexMatch",
    "ARRAY_CONTAINS",
    "ARRAY_CONTAINS_ANY",
    "ARRAY_CONTAINS_ALL",
    "IS_DEFINED",
    "IS_NULL",
    "IS_NUMBER",
];
ConditionUtil.OPERATOR_MAPPINGS = {
    "=": "$eq",
    "!=": "$ne",
    ">=": "$gte",
    "<=": "$lte",
    ">": "$gt",
    "<": "$lt",
};
/**
 * a regex to match binary expressions(e.g. "id LIKE" or "tags ARRAY_CONTAINS")
 */
ConditionUtil.simpleExpressionPattern = new RegExp(`(.+?)\\s*(${ConditionUtil.binaryOperators.join("|")})\\s*$`);
/**
 * a regex to match binary sub query expressions(e.g. "tags ARRAY_CONTAINS_ANY id" or "tags ARRAY_CONTAINS_ALL name")
 */
ConditionUtil.subQueryExpressionPattern = new RegExp(Expression_1.SUB_QUERY_EXPRESSION_PATTERN);
/**
 * convert Json to string value
 * @param value
 * @returns string value
 */
const _getStringValue = (value) => {
    let convertedStr = "";
    if (typeof value === "string") {
        convertedStr = value;
    }
    else {
        convertedStr = JSON.stringify(value);
    }
    return convertedStr;
};
//# sourceMappingURL=ConditionUtil.js.map