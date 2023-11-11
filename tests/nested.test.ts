import { MycoKV } from "../src";

describe("nested keys get, put, delete", () => {
    let myco: MycoKV;

    beforeAll(async () => {
        myco = await MycoKV.connect({
            host: "localhost",
            port: 6922,
        });
    });

    beforeEach(async () => {
        await myco.put("kitchen.cabinet.cups", 12);
        await myco.put("kitchen.toaster.bread", "wheat");
        await myco.put("kitchen.dishwasher.top_shelf.plates", 8);
        await myco.put("kitchen.toaster", "KitchenAid");
        await myco.put("kitchen.dishwasher", "GE");
    });

    afterEach(async () => {
        await myco.delete("kitchen.cabinet.cups");
        await myco.delete("kitchen.toaster.bread");
        await myco.delete("kitchen.dishwasher.top_shelf.plates");
        await myco.delete("kitchen.toaster");
        await myco.delete("kitchen.dishwasher");
    });

    afterAll(async () => {
        await myco.disconnect();
    });

    it("should put and get all nested keys", async () => {
        const nestedAll = await myco.get("kitchen.*");
        expect(nestedAll).toEqual({
            cabinet: { cups: 12 },
            toaster: { bread: "wheat", _: "KitchenAid" },
            dishwasher: { top_shelf: { plates: 8 }, _: "GE" },
        });
    });

    it("should put and get nested keys with depth limit", async () => {
        const nestedLimit = await myco.get("kitchen.*1");
        expect(nestedLimit).toEqual({
            toaster: "KitchenAid",
            dishwasher: "GE",
        });
    });

    it("should still return nested keys if parent value deleted", async () => {
        await myco.delete("kitchen.toaster");
        const nestedAll = await myco.get("kitchen.*");
        expect(nestedAll).toEqual({
            cabinet: { cups: 12 },
            toaster: { bread: "wheat" },
            dishwasher: { top_shelf: { plates: 8 }, _: "GE" },
        });
    });

    it("should recursively delete unused keys", async () => {
        await myco.delete("kitchen.dishwasher.top_shelf.plates");
        const nestedAll = await myco.get("kitchen.*");
        expect(nestedAll).toEqual({
            cabinet: { cups: 12 },
            toaster: { bread: "wheat", _: "KitchenAid" },
            dishwasher: "GE",
        });
    });
});
