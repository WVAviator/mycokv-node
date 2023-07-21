import net from "net";
import ConnectionOptions, {
    mergeDefaultConnectionOptions,
} from "./ConnectionOptions";

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
        await myco.establishConnection();
        myco.addListeners();
        return myco;
    }

    private establishConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.client = net.createConnection(
                    { host: this.host, port: this.port },
                    () => {
                        console.log(
                            `Successfully connected to MycoKV at ${this.host}:${this.port}`
                        );

                        setTimeout(resolve, 1000);
                    }
                );
            } catch (err) {
                console.log(err);
                reject(err);
            }
        });
    }

    private addListeners(): void {
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
            console.log(err);
        });
    }

    public async get(key: string): Promise<string> {
        //TODO: Handle nested keys and json return values
        //TODO: Handle errors
        return this.sendCommand(`GET ${key}\n`);
    }

    public async put(key: string, value: string): Promise<string> {
        //TODO: Handle errors
        return this.sendCommand(`PUT ${key} "${value}"\n`);
    }

    public async delete(key: string): Promise<string> {
        //TODO: Handle errors
        return this.sendCommand(`DELETE ${key}\n`);
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
}
