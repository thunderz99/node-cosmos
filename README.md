# node-cosmos - A light weight Azure CosmosDB Client for nodejs

node-cosmos is a client for Azure CosmosDB 's SQL API. Which is an opinionated library aimed at ease of creating REST API for CRUD and find.

## Background
* Microsoft's official nodejs CosmosDB client is verbose to use, especially when creating REST api to query/filter items.

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
        "lastName LIKE" : "Nobo%" // lastName starts with Nobo
    },
    sort: ["firstName", "ASC"],
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
        id : ["id010", "id011"] // id equals "id010" or "id011"
        lastName : "Nobody"
    },
    sort: ["firstName", "ASC"],
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

### CRUD

```typescript

const db = await new Cosmos(process.env.COSMOSDB_CONNECTION_STRING).getDatabase("Database1");

// Read
const user1 = await db.read("Collection1", "id001", "Users");

// Update
user1.lastName = "Updated";
await db.update("Collection1", user1, "Users");

// Upsert
await db.upsert("Collection1", user1, "Users");

// Delete
await db.delete("Collection1", user1.id, "Users");

```

### Count

The `count()` is similar to `find()`, but the count will ignore offset and limit.

```typescript
const db = await new Cosmos(process.env.COSMOSDB_CONNECTION_STRING).getDatabase("Database1");

const total = await db.count("Collection1", {
    filter: {
        lastName : "Nobody"
    },
    offset: 0,
    limit: 100 // total is able to greater than limit
}, "Users");
```

### Partial Update

```typescript

// update the lastName field only
await db.update("Collection", {id: "id001", lastName:"LastNameUpdated"}, "Users");

// if you want to override the item without partial update feature, you can use `upsert` instead, which does not perform partial updating.

```


### Complex queries

```typescript

const cond = {
  filter: {
    id: "id010", // id equal to 'id010'
    "lastName LIKE": "%Ban%", // last name CONTAINS "Ban"
    "firstName !=": "Andy", // not equal
    location:  ["New York", "Paris"], // location is 'New York' or 'Paris'. see cosmosdb IN
    "age >=": 20, // see cosmosdb compare operators
    "desciption CONTAINS": "Project manager",// see cosmosdb CONTAINS
    "skill ARRAY_CONTAINS": "Java", // see cosmosdb ARRAY_CONTAINS
    "tagIds ARRAY_CONTAINS_ANY": ["T001", "T002"], // field tagIds which is an array, contains any of ["T001", "T002"]. see cosmosdb EXISTS for details.
    "tags ARRAY_CONTAINS_ALL name": ["Java", "React"], //field tags which is an array of Tag, who's name contains all of ["Java", "React"]. see cosmosdb EXISTS for details.
  },
  sort: ["lastName", "ASC"], //optional sort order
  offset: 0, //optional offset
  limit: 100 //optional limit
}

const users = await db.find("Collection1", cond, "Users");

```

### Cross-partition queries

```typescript

const cond = {
  filter: {
    "id LIKE": "ID00%", // id starts with "ID00"
  },
};

// if you do not specify the partition, this will be a cross-partition query
const result = await db.find("Collection1", cond, undefined);

// or just
const result = await db.find("Collection1", cond);

```