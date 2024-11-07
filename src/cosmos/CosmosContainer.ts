/**
 * A class represent a container for cosmosdb/mongodb
 */
export class CosmosContainer {
    /**
     * The name of the container/collection
     */
    name = "";

    /**
     * The real container instance of cosmosdb/mongodb
     */
    container: unknown = null;

    constructor(name: string, container: unknown = null) {
        this.name = name;
        this.container = container;
    }
}
