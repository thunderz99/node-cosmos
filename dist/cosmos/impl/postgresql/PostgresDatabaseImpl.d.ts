import { Condition } from "../../condition/Condition";
import { CosmosDatabase, CosmosDocument, CosmosId } from "../../CosmosDatabase";
import { CosmosContainer } from "../../CosmosContainer";
import { Pool } from "pg";
export declare class PostgresDatabaseImpl implements CosmosDatabase {
    private readonly pool;
    private readonly dbName;
    private readonly collectionMap;
    constructor(pool: Pool, dbName: string);
    createCollection(coll: string): Promise<CosmosContainer>;
    deleteCollection(coll: string): Promise<void>;
    getCollection(coll: string): Promise<CosmosContainer>;
    create(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    read(coll: string, id: string, partition?: string): Promise<CosmosDocument>;
    readOrDefault(coll: string, id: string, partition: string, defaultValue: CosmosDocument | null): Promise<CosmosDocument | null>;
    upsert(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    update(coll: string, data: CosmosDocument, partition?: string): Promise<CosmosDocument>;
    delete(coll: string, id: string, partition?: string): Promise<CosmosId>;
    find(coll: string, condition: Condition, partition?: string): Promise<CosmosDocument[]>;
    findBySQL(coll: string, query: string, partition?: string): Promise<CosmosDocument[]>;
    count(coll: string, condition: Condition, partition?: string): Promise<number>;
    private extractResource;
}
//# sourceMappingURL=PostgresDatabaseImpl.d.ts.map