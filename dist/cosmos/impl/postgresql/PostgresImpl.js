"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresImpl = void 0;
const PostgresDatabaseImpl_1 = require("./PostgresDatabaseImpl");
const pg_1 = require("pg");
const assert_1 = require("../../../util/assert");
const defaultPoolFactory = (connectionString) => {
    return new pg_1.Pool({ connectionString });
};
class PostgresImpl {
    constructor(connectionString, poolFactory) {
        this.databaseMap = new Map();
        (0, assert_1.assertIsDefined)(connectionString, "connectionString");
        (0, assert_1.assertNotEmpty)(connectionString, "connectionString");
        const factory = poolFactory || defaultPoolFactory;
        this.pool = factory(connectionString);
    }
    async getDatabase(db) {
        const database = this.databaseMap.get(db);
        if (database) {
            return database;
        }
        const newDatabase = new PostgresDatabaseImpl_1.PostgresDatabaseImpl(this.pool, db);
        this.databaseMap.set(db, newDatabase);
        return newDatabase;
    }
    async deleteDatabase(db) {
        this.databaseMap.delete(db);
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresImpl = PostgresImpl;
//# sourceMappingURL=PostgresImpl.js.map