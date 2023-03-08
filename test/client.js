const Vidar = require("../src/index");
const { Client } = require("discord.js");
const client = new Client({
    // @ts-ignore due to accessing private method
    intents: Vidar.allIntents()
});

// eslint-disable-next-line no-undef
Vidar.initialize(client, __dirname + "/commands", ["668485643487412234"]);

client.once("ready", () => {
    console.log("READY");
});

// @ts-ignore due to accessing private method
// eslint-disable-next-line no-undef
client.login(Vidar.loadToken(__dirname + "/token.json"));