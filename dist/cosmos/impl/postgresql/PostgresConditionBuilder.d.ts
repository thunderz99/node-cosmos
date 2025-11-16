import { Condition } from "../../condition/Condition";
export type QueryComponents = {
    whereClause: string;
    orderClause: string;
    limitClause: string;
    params: unknown[];
};
export declare class PostgresConditionBuilder {
    private readonly alias;
    private readonly params;
    private aliasCounter;
    constructor(alias?: string);
    build(condition: Condition, countOnly?: boolean): QueryComponents;
    private buildWhereClause;
    private buildOrderClause;
    private buildLimitClause;
    private buildClause;
    private buildSimpleClause;
    private buildArrayClause;
    private buildArrayAnyClause;
    private buildArrayAllClause;
    private jsonTextAccessor;
    private jsonAccessor;
    private jsonArrayAccessor;
    private jsonElementTextAccessor;
    private splitPath;
    private escapeSegment;
    private addParam;
    private nextAlias;
    private toTextValue;
}
//# sourceMappingURL=PostgresConditionBuilder.d.ts.map