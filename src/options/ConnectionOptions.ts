interface ConnectionOptions {
    /**
     * The host of the MycoKV server to connect to. Defaults to localhost.
     */
    host: string;
    /**
     * The port of the MycoKV server to connect to. Defaults to 6922.
     */
    port: number;
}

const defaultConnectionOptions: ConnectionOptions = {
    host: "localhost",
    port: 6922,
};

export const mergeDefaultConnectionOptions = (
    options?: Partial<ConnectionOptions>
): ConnectionOptions => {
    return {
        ...defaultConnectionOptions,
        ...(options || {}),
    };
};

export default ConnectionOptions;
