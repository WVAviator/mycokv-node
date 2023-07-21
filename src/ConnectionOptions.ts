interface ConnectionOptions {
    host: string;
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
