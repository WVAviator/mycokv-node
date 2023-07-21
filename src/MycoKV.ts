import net from "net";
import ConnectionOptions, {
    mergeDefaultConnectionOptions,
} from "./ConnectionOptions";
import ConnectionError from "./errors/ConnectionError";
import ValueTypeError from "./errors/ValueTypeError";

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

    public async get(key: string): Promise<unknown> {
        const keyParts = key.split(".");
        if (keyParts.length > 1 && keyParts.at(-1)?.startsWith("*")) {
            const responseJson = await this.sendCommand(`GET ${key}`);
            try {
                const response = JSON.parse(responseJson);
                return response;
            } catch (err) {
                return responseJson;
            }
        }
        //TODO: Handle errors
        const response = await this.sendCommand(`GET ${key}\n`);
        return this.parseValue(response);
    }

    public async put<T extends string | number | boolean | null>(
        key: string,
        value: T
    ): Promise<T> {
        const response = await this.sendCommand(
            `PUT ${key} ${this.stringifyValue(value)}\n`
        );

        //TODO: Handle errors

        return this.parseValue(response) as T;
    }

    public async delete(key: string): Promise<unknown> {
        //TODO: Handle errors
        const value = await this.sendCommand(`DELETE ${key}\n`);
        return this.parseValue(value);
    }

    public async disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.end(() => {
                resolve();
            });
        });
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
        if (value === "null") return null;
        if (value === "true") return true;
        if (value === "false") return false;
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        }
        if (value.match(/^-?\d+$/)) return parseInt(value);
        if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);
        throw new ValueTypeError(
            value,
            "Invalid value type returned by MycoKV server."
        );
    }
}
