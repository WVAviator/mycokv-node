const ERROR_CODES = {
    E01: "Unknown command",
    E02: "Missing key",
    E03: "Invalid key",
    E04: "Missing value",
    E05: "Invalid value",
    E06: "Log write failure",
    E07: "Log read failure",
    E08: "Log load failure",
    E09: "Key not found",
    E10: "Restore error",
    E11: "Operation failure",
    E12: "Internal error",
    E13: "Serialization failure",
    E14: "Missing command",
    E15: "Invalid expiration",
} as const;

class MycoKVError extends Error {
    public code: keyof typeof ERROR_CODES;

    constructor(message: string) {
        const code = message.slice(0, 3) as keyof typeof ERROR_CODES;
        const error = ERROR_CODES[code];

        super(`MycoKV returned error code ${code}: ${error}. \n${message}`);

        this.name = "MycoKVError";
        this.code = code;
        Object.setPrototypeOf(this, MycoKVError.prototype);
    }

    static hasError(message: string): boolean {
        const code = message.slice(0, 3);
        return code in ERROR_CODES;
    }
}

export default MycoKVError;
