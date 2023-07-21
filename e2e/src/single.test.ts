import { MycoKV } from "mycokv-node";

describe("single keys get, put, delete", () => {
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

    it("should put and get a single string value", async () => {
        await myco.put("foo", "bar");
        const get = await myco.get("foo");
        expect(get).toEqual("bar");

        await myco.delete("foo");
    });

    it("should put and get a single number value", async () => {
        await myco.put("foo", 123);
        const get = await myco.get("foo");
        expect(get).toEqual(123);

        await myco.delete("foo");
    });

    it("should put and get a single boolean value", async () => {
        await myco.put("foo", true);
        const get = await myco.get("foo");
        expect(get).toEqual(true);

        await myco.delete("foo");
    });

    it("should put and get a single null value", async () => {
        await myco.put("foo", null);
        const get = await myco.get("foo");
        expect(get).toEqual(null);

        await myco.delete("foo");
    });
});
