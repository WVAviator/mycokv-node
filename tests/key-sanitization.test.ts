import { KeyFormatError, MycoKV } from "../src";

describe("key sanitization", () => {
    let myco: MycoKV;

    beforeAll(async () => {
        myco = await MycoKV.connect({
            host: "localhost",
            port: 6922,
        });
    });

    afterAll(async () => {
        await myco.disconnect();
    });

    afterEach(async () => {
        await myco.purge();
    });

    it("should allow valid keys for all methods", async () => {
        const keys = [
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "1234567890",
            "!@#$%^&()-+=_~`/.,';?><\"",
        ];

        for (let key of keys) {
            await expect(myco.put(key, "bar")).resolves.not.toThrow();
            await expect(myco.get(key)).resolves.not.toThrow();
            await expect(myco.expire(key, 100)).resolves.not.toThrow();
            await expect(myco.delete(key)).resolves.not.toThrow();
        }
    });

    it("should not allow any whitespace in keys", async () => {
        const keys = [
            "foo bar",
            "foo\tbar",
            "foo\nbar",
            "foo\rbar",
            "foo\fbar",
            "foo\vbar",
            "foo\u00A0bar",
            "foo\u2028bar",
            "foo\u2029bar",
            "foo\uFEFFbar",
            "            foobar",
            "foobar            ",
        ];

        for (let key of keys) {
            await expect(myco.put(key, "bar")).rejects.toThrow(KeyFormatError);
            await expect(myco.get(key)).rejects.toThrow(KeyFormatError);
            await expect(myco.expire(key, 100)).rejects.toThrow(KeyFormatError);
            await expect(myco.delete(key)).rejects.toThrow(KeyFormatError);
        }
    });

    it("should allow wildcards for get (provided it follows a .) but not other methods", async () => {
        await myco.put("foo.bar", "baz");

        await expect(myco.put("foo.*", "bar")).rejects.toThrow(KeyFormatError);
        await expect(myco.get("foo*")).rejects.toThrow(KeyFormatError);
        await expect(myco.expire("foo.*", 100)).rejects.toThrow(KeyFormatError);
        await expect(myco.delete("foo.*")).rejects.toThrow(KeyFormatError);

        await expect(myco.get("foo.*")).resolves.toEqual({
            bar: "baz",
        });
    });

    it("should not allow invalid use of the nesting operator", async () => {
        await expect(myco.put("foo..bar", "baz")).rejects.toThrow(
            KeyFormatError
        );
        await expect(myco.put("foo.bar.", "baz")).rejects.toThrow(
            KeyFormatError
        );
        await expect(myco.put(".foo.bar", "baz")).rejects.toThrow(
            KeyFormatError
        );
        await expect(myco.put("..foo", "baz")).rejects.toThrow(KeyFormatError);
        await expect(myco.put(".", "baz")).rejects.toThrow(KeyFormatError);
    });
});
