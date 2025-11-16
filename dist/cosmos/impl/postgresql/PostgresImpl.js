"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresImpl = void 0;
const PostgresDatabaseImpl_1 = require("./PostgresDatabaseImpl");
const pg_1 = require("pg");
const assert_1 = require("../../../util/assert");
/** Default Pool factory that just forwards the connection string. */
const defaultPoolFactory = (connectionString) => {
    return new pg_1.Pool({ connectionString });
};
/**
 * Concrete Cosmos driver backed by PostgreSQL.
 * Manages one pg Pool and lazily creates PostgresDatabaseImpl instances.
 */
class PostgresImpl {
    /**
     * @param connectionString PostgreSQL connection string.
     * @param poolFactory Optional factory for dependency injection.
     */
    constructor(connectionString, poolFactory) {
        /** Local cache of database handles keyed by name. */
        this.databaseMap = new Map();
        (0, assert_1.assertIsDefined)(connectionString, "connectionString");
        (0, assert_1.assertNotEmpty)(connectionString, "connectionString");
        const factory = poolFactory || defaultPoolFactory;
        this.pool = factory(connectionString);
    }
    /** Returns a cached or newly created PostgresDatabaseImpl. */
    async getDatabase(db) {
        const database = this.databaseMap.get(db);
        if (database) {
            return database;
        }
        const newDatabase = new PostgresDatabaseImpl_1.PostgresDatabaseImpl(this.pool, db);
        this.databaseMap.set(db, newDatabase);
        return newDatabase;
    }
    /** Removes cached database handles. */
    async deleteDatabase(db) {
        this.databaseMap.delete(db);
    }
    /** Closes the pg Pool and underlying connections. */
    async close() {
        await this.pool.end();
    }
}
exports.PostgresImpl = PostgresImpl;
//# sourceMappingURL=PostgresImpl.js.map