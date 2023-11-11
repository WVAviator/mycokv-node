import net from "net";
import ConnectionOptions, {
    mergeDefaultConnectionOptions,
} from "./options/ConnectionOptions";
import ConnectionError from "./errors/ConnectionError";
import ValueTypeError from "./errors/ValueTypeError";
import MycoKVError from "./errors/MycoKVError";
import PutOptions from "./options/PutOptions";
import KeyFormatError from "./errors/KeyFormatError";

/**
 * MycoKV client. Connect to a running MycoKV server and perform key/value database operations.
 * For more information on setting up a MycoKV server, see the [MycoKV documentation](https://github.com/WVAviator/myco-kv/tree/main#mycokv).
 *
 * ### Example Usage
 * ```typescript
 * import { MycoKV } from "mycokv-node";
 *
 * const myco = await MycoKV.connect({
 *    host: "localhost",
 *    port: 6922,
 * });
 *
 * try {
 *   await myco.put("foo", "bar");
 *   const get = await myco.get("foo");
 *   console.log(get); // "bar"
 *
 *   await myco.delete("foo");
 *
 * } catch (error) {
 *  // Handle any potential server errors
 * }
 *
 * await myco.disconnect();
 *
 * ```
 */
export default class MycoKV {
    private responseResolver:
        | ((value: string | PromiseLike<string>) => void)
        | null = null;
    private client: net.Socket;
    private host: string;
    private port: number;

    private constructor(connectionOptions: ConnectionOptions) {
        this.host = connectionOptions.host;
        this.port = connectionOptions.port;
    }

    /**
     * Creates a new MycoKV client and connects to the MycoKV server at the host and port specified in the provided options object.
     * @param options A ConnectionOptions object containing the host and port of the MycoKV server to connect to. Defaults to localhost:6922.
     * @returns A MycoKV client instance.
     */
    public static async connect(
        options?: Partial<ConnectionOptions>
    ): Promise<MycoKV> {
        const myco = new MycoKV(mergeDefaultConnectionOptions(options));
        try {
            await myco.establishConnection();
            return myco;
        } catch (err) {
            throw new ConnectionError();
        }
    }

    private establishConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client = net.createConnection(
                { host: this.host, port: this.port },
                () => {
                    console.log(
                        `Successfully connected to MycoKV at ${this.host}:${this.port}`
                    );

                    setTimeout(resolve, 1000);
                }
            );

            this.client.on("data", (data) => {
                if (this.responseResolver) {
                    this.responseResolver(data.toString());
                    this.responseResolver = null;
                }
            });

            this.client.on("end", () => {
                console.log("MycoKV connection terminated.");
            });

            this.client.on("error", (err) => {
                reject(err);
            });
        });
    }

    /**
     * Processes a MycoKV GET operation. Returns the value of the key specified in the `key` parameter.
     * @param key The key to retrieve the value of.
     * @returns The value of the key specified in the `key` parameter. The value will also be converted to the appropriate type (string, number, boolean, or null).
     */
    public async get(key: string): Promise<unknown> {
        this.sanitizeKey(key);
        const keyParts = key.split(".");
        if (keyParts.length > 1 && keyParts.at(-1)?.startsWith("*")) {
            const responseJson = await this.sendCommand(`GET ${key}\n`);
            if (MycoKVError.hasError(responseJson))
                throw new MycoKVError(responseJson);
            try {
                const response = JSON.parse(responseJson);
                return response;
            } catch (err) {
                return responseJson;
            }
        }

        const response = await this.sendCommand(`GET ${key}\n`);
        if (MycoKVError.hasError(response)) throw new MycoKVError(response);
        return this.parseValue(response);
    }

    /**
     * Processes a MycoKV PUT operation. Sets the value of the key specified in the `key` parameter to the value specified in the `value` parameter.
     * @param key The key to set the value of. Must be a string.
     * @param value The value to set the key to. Can be a string, number, boolean, or null.
     * @param options An optional object containing additional options for the PUT operation, including a TTL (time to live) value that will process an EXPIRE operation after the PUT operation is complete.
     * @returns The value of the key specified in the `key` parameter. The value will also be converted to the appropriate type (string, number, boolean, or null).
     */
    public async put<T extends string | number | boolean | null>(
        key: string,
        value: T,
        options: Partial<PutOptions> = {}
    ): Promise<T> {
        this.sanitizeKey(key, false);

        const response = await this.sendCommand(
            `PUT ${key} ${this.stringifyValue(value)}\n`
        );

        if (MycoKVError.hasError(response)) throw new MycoKVError(response);

        if (options.ttl) {
            const expireResponse = await this.sendCommand(
                `EXPIRE ${key} ${options.ttl}\n`
            );
            if (MycoKVError.hasError(expireResponse))
                throw new MycoKVError(expireResponse);
        }

        return this.parseValue(response) as T;
    }

    /**
     * Processes a MycoKV EXPIRE operation. Sets the expiration of the key specified in the `key` parameter to be the number of milliseconds specified in the `ttl` parameter.
     * @param key THe key to set the expiration of.
     * @param ttl The number of milliseconds from now until the key expires.
     */
    public async expire(key: string, ttl: number): Promise<void> {
        this.sanitizeKey(key, false);
        const response = await this.sendCommand(`EXPIRE ${key} ${ttl}\n`);
        if (MycoKVError.hasError(response)) throw new MycoKVError(response);
    }

    /**
     * Processes a MycoKV DELETE operation. Deletes the key specified in the `key` parameter. If the key does not exist, the operation will be ignored.
     * @param key The key to delete.
     */
    public async delete(key: string): Promise<void> {
        this.sanitizeKey(key, false);
        const value = await this.sendCommand(`DELETE ${key}\n`);
        if (MycoKVError.hasError(value)) {
            const error = new MycoKVError(value);
            // Ignore error if key not found
            if (error.code === "E09") return;

            throw error;
        }
    }

    /**
     * Processes a MycoKV PURGE operation. Deletes all keys in the database and erases the write-ahead log. This operation should be used with caution.
     */
    public async purge(): Promise<void> {
        const response = await this.sendCommand(`PURGE\n`);
        if (MycoKVError.hasError(response)) throw new MycoKVError(response);
    }

    /**
     * Disconnects this MycoKV client from the MycoKV server. This operation should always be performed when you are finished using the client, otherwise the connection will remain open indefinitely.
     */
    public async disconnect(): Promise<void> {
        await this.client.destroy();
    }

    private sendCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.responseResolver) {
                reject("Already awaiting response");
            }
            this.responseResolver = resolve;
            this.client.write(command);
        });
    }

    private stringifyValue(value: string | number | boolean | null) {
        switch (typeof value) {
            case "string":
                return `"${value}"`;
            case "number":
                return value.toString();
            case "boolean":
                return value.toString();
            case "object":
                if (value === null) return "null";
                throw new ValueTypeError(value);
            default:
                throw new ValueTypeError(value);
        }
    }

    private parseValue(value: string): string | number | boolean | null {
        value = value.slice(0, -1);

        if (value === "null") return null;
        if (value === "true") return true;
        if (value === "false") return false;
        if (value.match(/^-?\d+$/)) return parseInt(value);
        if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);

        return value.slice(1, -1);
    }

    private sanitizeKey(key: string, readOnly: boolean = true) {
        // Matches any key that does not contain a whitespace character
        const whitespaceRegex = /^([^\s])+$/;

        // Matches any key that does not contain whitespace or an asterisk unless the asterisk follows a period at the end of the string. Can also be followed by an integer.
        const wildcardRegex = /^([^\s\*])+(\.\*([0-9]*)$)*$/;

        // Matches any key that does not contain an asterisk
        const asteriskRegex = /^[^\*]*$/;

        // Matches any key that does not start with, end with, or have consecutive periods contained within it
        const periodRegex = /^(?!.*\.{2,})[^.].*[^.]$/;

        if (!whitespaceRegex.test(key)) {
            throw new KeyFormatError(
                `Key cannot contain whitespace.\nProvided key: ${key}`
            );
        }

        if (readOnly && !wildcardRegex.test(key)) {
            throw new KeyFormatError(
                `Key contains invalid use of the wildcard operator "*".\nCorrect usage is "key.*"\nProvided key: ${key}`
            );
        }

        if (!readOnly && !asteriskRegex.test(key)) {
            throw new KeyFormatError(
                `The wildcard operator "*" cannot be used for write operations.\nProvided key: ${key}`
            );
        }

        if (!periodRegex.test(key)) {
            throw new KeyFormatError(
                `Key cannot start with, end with, or contain consecutive periods.\nProvided key: ${key}`
            );
        }
    }
}
