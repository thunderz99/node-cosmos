# node-cosmos - A light weight Azure CosmosDB Client for nodejs

node-cosmos is a client for Azure CosmosDB 's SQL API (also called documentdb formerly). Which is an opinionated library aimed at ease of use for CRUD and find (aka. query).

## Background
* Microsoft's official nodejs CosmosDB client is verbose to use

## Disclaimer
* This is an alpha version, and features are focused to CRUD and find at present.

## Quickstart

### Start programming 

```typescript
import { Cosmos } from "node-cosmos"

const db = await new Cosmos("YOUR_CONNECTION_STRING").getDatabase("my-awesome-db");

await db.upsert("my-awesome-coll", { id:"id011", firstName: "Anony", lastName: "Nobody"} );
  
const users = await db.find("Collection1", {
    filter: {
        id : "id010", // id equals "id010"
        lastName : "Nobody" 
    },
    sort:["firstName", "ASC"],
    offset: 0,
    limit: 100
});
```


## Examples

### Work with partitions 

```typescript
// Save user into Coll:Collection1, partition:Users.
// If you do not specify the partition. It will default to coll name.

const db = await new Cosmos("YOUR_CONNECTION_STRING").getDatabase("Database1");

await db.upsert("Collection1", {id: "id011", firstName: "Tom", lastName: "Banks"}, "Users");

// The default partition key is "_partition", so we'll get a json like this:
// {
//    "id": "id011",
//    "firstName": "Tom",
//    "lastName": "Banks",
//    "_partition": "Users"
// }

const users = await db.find("Collection1", {
    filter: {
        id : "id010", // id equals "id010"
        lastName : "Nobody" 
    },
    sort:["firstName", "ASC"],
    offset: 0,
    limit: 100
}, "Users");

```


### Create database and collection from zero

```typescript
//get db(create if not exist)
const db = await new Cosmos(process.env.COSMOSDB_CONNECTION_STRING).getDatabase("Database1");

//create a collection(if not exist)
await db.createCollection("Collection1");

```

### Complex queries

TODO


