// Test of subcommands
const { command } = require("../../src/index");
let color = null;

command("subc", "Subcommand test")
.argument("set <color> [msg]")
.argument("get")
.action({
    "set": i => {
        color = i.options.getString("color");
        const msg = i.options.getString("msg", false);
        i.reply("Set color to " + color + "! " + (msg ?? ""));
    },
    "get": i => {
        if (color) i.reply("Color is " + color + "!");
        else i.reply("Set the color first!");
    }
});