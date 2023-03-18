// Basic command tests
const { command, dirname } = require("../../src/index");

command("ping", "Ping.")
.action(i => {
    i.reply("Pong!");
});

command("pong", "Reunping.")
.docs(dirname() + "/docs.json")
.argument("[color: red | orange | yellow | green | blue | purple]")
.action(i => {
    if (i.options.getString("color")) i.reply(i.options.getString("color") + " is a great color! Ping.");
    else i.reply("Poooooong. Why no color?");
});