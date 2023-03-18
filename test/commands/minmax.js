const { command, def, args, dirname } = require("../../src/index");

command("minmax", "Testing min and max.")
.docs(dirname() + "/docs.json")
.argument("<value: 27 > l > 3> [multiplier: 1 < x < 3]")
.action({
    [def]: i => {
        const { value, multiplier=1 } = args(i);
        i.reply("Value: " + value.repeat(multiplier));
    }
});
