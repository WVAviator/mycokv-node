class KeyFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KeyFormatError";
        Object.setPrototypeOf(this, KeyFormatError.prototype);
    }
}

export default KeyFormatError;
