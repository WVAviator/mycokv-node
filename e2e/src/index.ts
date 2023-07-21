import { MycoKV } from "mycokv-node";

const testBasicCommands = async () => {
    const myco = await MycoKV.connect("http://127.0.0.1:6922");

    console.log("Testing basic commands...");

    console.log("Testing put...");
    const put = await myco.put("foo", "bar");
    console.log(put);

    console.log("Testing get...");
    const get = await myco.get("foo");
    console.log(get);

    console.log("Testing delete...");
    const del = await myco.delete("foo");
    console.log(del);

    console.log("Testing get after delete...");
    const get2 = await myco.get("foo");
    console.log(get2);

    console.log("Testing disconnect...");
    await myco.disconnect();

    console.log("Basic commands test complete.");
};

testBasicCommands();
