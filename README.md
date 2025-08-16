![LabORM's logo](./laborm-logo.png)

#

An experimental object relation model generator for NodeJS + TypeScript

## How to get started?

Define a schema file, of course, here's an example:

```
@engine sqlite3 {
    file: "test.db"
}

model Users {
    id Int Primary AutoIncrement
    name String

    age Int Default 0
}

model Posts {
    id Int Primary AutoIncrement

    title String
    body String
}
```

And with a simple command.. `laborm migrate` You will have a database and client ready to use!

## Using the generated client:

```typescript
import { LabClient } from "./labORM/laborm";

(async () => {
  const laborm = new LabClient();

  await laborm.users.insert({
    age: 18,
    name: "Miyuki",
  });

  console.log(
    await laborm.users.insert({
      age: 20,
      name: "Nozomi",
    })
  );

  await laborm.close();
})();
```

## TODO

- [ ] Improve the entire code
- [ ] Documentation
- [x] Schema Parsing
- [x] Diff detection
- [x] Migration application
- [x] Client Generation
- [ ] A better query system
- [ ] Insert or Update
- [ ] UPDATE
- [ ] DELETE
- [ ] Foreign Keys
- [ ] @import statements in schemas for multiple schema files
- [ ] Allow inspection of existing databases to generate a schema from

## Todo for the very, very long future ahead:

- [ ] Prisma Schema conversion
