# mycokv-node

This library is a nodejs client for [MycoKV](https://github.com/WVAviator/myco-kv).
MycoKV is a fast and lightweight hierarchical key-value store built in Rust. This package enables Node.js backend servers to query MycoKV instances running on the same machine.

## Installation and Setup

Add mycokv-node to your project using NPM or your preferred package manager:

```bash
npm install mycokv-node
```

If you do not already have an instance of MycoKV running on your machine, you can spin one up very quickly with Docker by running:

```bash
docker run -d -p 6922:6922 wvaviator/mycokv
```

For more ways to install, please see the [MycoKV Documentation](https://github.com/WVAviator/myco-kv#installation).

## Basic Usage

```javascript
import { MycoKV } from "mycokv-node";

const myco = await MycoKV.connect({
    host: "localhost",
    port: 6922,
});

try {
    await myco.put("foo", "bar");
    const get = await myco.get("foo");
    console.log(get); // "bar"

    await myco.delete("foo");
} catch (error) {
    // Handle any errors
}

await myco.disconnect();
```

## Commands

### PUT

This command sets a key-value pair in the database. The key must be a string (without spaces or asterisks), but the value can be a string, number, boolean, or null.

```javascript
await myco.put("foo", "bar");
```

Optionally, you can specify a TTL (in milliseconds) for the key-value pair:

```javascript
await myco.put("foo", "bar", {
    ttl: 5000,
});
```

### GET

This command retrieves a value from the database. If the key does not exist, an error is thrown. You should handle this error in your code.

```javascript
try {
    const get = await myco.get("foo");
    console.log(get); // "bar"
} catch (error) {
    // Handle key not found error
    if (error.type === "E09") {
        console.log("Key not found, adding...");
        await myco.put("foo", "bar");
    }
}
```

The get command can be used to fetch multiple nested keys at once using MycoKV's wildcard operator. This operation will return a Javascript object with the resulting key-value pairs assigned as properties.

```javascript
await myco.put("kitchen.cabinet.cups", 12);
await myco.put("kitchen.toaster.bread", "wheat");
await myco.put("kitchen.dishwasher.top_shelf.plates", 8);
await myco.put("kitchen.toaster", "KitchenAid");
await myco.put("kitchen.dishwasher", "GE");

const get = await myco.get("kitchen.*");

console.log(get);
// {
//     cabinet: { cups: 12 },
//     toaster: { bread: "wheat", _: "KitchenAid" },
//     dishwasher: { top_shelf: { plates: 8 }, _: "GE" },
// };
```

Please review the [MycoKV Documentation](https://github.com/WVAviator/myco-kv) for more information on nested keys.

### EXPIRE

This command sets a TTL (in milliseconds) for a key-value pair. If the key does not exist, an error is thrown.

```javascript
myco.expire("foo", 5000);
```

### DELETE

This command deletes a key-value pair from the database. If the key does not exist, the command is ignored.

```javascript
await myco.delete("foo");
```

### PURGE

This command deletes all key-value pairs from the database and log. Use caution.

```javascript
await myco.purge();
```

## Error Handling

All errors thrown by the server are returned as objects with a "type" property. The type is a string that can be used to identify the error type in your code.

```javascript
try {
    await myco.put("foo", "bar");
} catch (error) {
    console.log(error.type); // "Exx"
}
```

The following error codes can be returned by MycoKV and handled:

```
E01: "Unknown command"
E02: "Missing key"
E03: "Invalid key"
E04: "Missing value"
E05: "Invalid value"
E06: "Log write failure"
E07: "Log read failure"
E08: "Log load failure"
E09: "Key not found"
E10: "Restore error"
E11: "Operation failure"
E12: "Internal error"
E13: "Serialization failure"
E14: "Missing command"
E15: "Invalid expiration"
```

## Typescript

mycokv-node is written in Typescript and includes type definitions. If you are using Typescript, you can make use of the library's interfaces in the following ways:

```typescript
import { MycoKV, MycoKVOptions, MycoKVError } from "mycokv-node";

const options: MycoKVOptions = {
    host: "localhost",
    port: 6922,
};

const myco: MycoKV = await MycoKV.connect(options);

try {
    await myco.put<string>("foo", "bar"); // Generic argument is optional, will be inferred
    const get = (await myco.get("foo")) as string;
    console.log(get); // "bar"

    await myco.delete("foo");
} catch (error: unknown) {
    error instanceof MycoKVError &&
        console.error(`${error.type}: ${error.message}`);
}

await myco.disconnect();
```

The types from values return from GET operations are unknown. If you know what you can expect to receive back from MycoKV, you can cast the result to the appropriate type or interface:

```typescript
interface Kitchen {
    cabinet: {
        cups: number;
    };
    toaster: {
        bread: string;
    };
}

await myco.put("kitchen.cabinet.cups", 12);
await myco.put("kitchen.toaster.bread", "wheat");

const get = (await myco.get("kitchen.*")) as Kitchen;
const cups = (await myco.get("kitchen.cabinet.cups")) as number;
```

## Contributing

MycoKV and mycokv-node are both in active development, and any contributions are welcome. You can contribute by providing any of the following:

- Suggesting new features or improvements
- Reporting bugs or issues
- Contributing code or design decisions
- Providing feedback on existing or developing features

Please reach out if you have any questions!
