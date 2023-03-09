// Test of subcommands
const { command } = require("../../src/index");
let color = null;

command("subc", "Subcommand test")
.subcommand({
    name: "set",
    description: "Set a color."
})
.argument({
    syntax: "set <color>",
    description: "The color to set."
})
.subcommand({
    name: "get",
    description: "Get a color."
})
.action(i => {
    if (i.options.getSubcommand() == "set") {
        color = i.options.getString("color");
        i.reply("Set color to " + color + "!");
    }
    else {
        if (color) i.reply("Color is " + color + "!");
        else i.reply("Set the color first!");
    }
});