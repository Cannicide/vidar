// Basic command tests
const { command } = require("../../src/index");

command("ping", "Ping.")
.action(i => {
    i.reply("Pong!");
});

command("pong", "Reunping.")
.argument({
    syntax: "[color]",
    description: "What is your favorite color?"
})
.action(i => {
    if (i.options.getString("color")) i.reply(i.options.getString("color") + " is a great color! Ping.");
    else i.reply("Poooooong. Why no color?");
});

// TODO: add more tests in other files