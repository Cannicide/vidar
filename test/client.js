const Vidar = require("../src/index");
const { Client } = require("discord.js");
const client = new Client({
    // @ts-ignore due to accessing private method
    intents: Vidar.allIntents()
});

Vidar.initialize({
    client,
    commandPath: Vidar.dirname() + "/commands",
    debugGuilds: ["668485643487412234"]
});

client.once("ready", () => {
    console.log("READY");
});

client.login(Vidar.loadToken(Vidar.dirname() + "/token.json"));