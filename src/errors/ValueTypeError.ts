class ValueTypeError extends Error {
    constructor(value: any, message?: string) {
        super(
            `Invalid MycoKV value: ${value}\n${
                message ||
                "MycoKV can only store strings, numbers, booleans, and null."
            }`
        );
        this.name = "ValueTypeError";
    }
}

export default ValueTypeError;
