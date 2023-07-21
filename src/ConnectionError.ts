class ConnectionError extends Error {
    constructor() {
        super(
            "Connection to MycoKV failed. Please verify that MycoKV is running and that the host and port are correct."
        );
        this.name = "ConnectionError";
    }
}

export default ConnectionError;
