"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosContainer = void 0;
/**
 * A class represent a container for cosmosdb/mongodb
 */
class CosmosContainer {
    constructor(name, container = null) {
        /**
         * The name of the container/collection
         */
        this.name = "";
        /**
         * The real container instance of cosmosdb/mongodb
         */
        this.container = null;
        this.name = name;
        this.container = container;
    }
}
exports.CosmosContainer = CosmosContainer;
//# sourceMappingURL=CosmosContainer.js.map