class ValueTypeError extends Error {
    constructor(value: any, message?: string) {
        super(
            message ||
                `Value ${value} is not a valid MycoKV value type. MycoKV can only store strings, numbers, booleans, and null.`
        );
        this.name = "ValueTypeError";
    }
}

export default ValueTypeError;
