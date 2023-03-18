// Test of subgroups and datatypes
const { command, dirname } = require("../../src/index");
let opts = {
    groups: [],
    users: []
};

command("subg", "Subgroup test")
.docs(dirname() + "/docs.json")
.arguments([
    "group add <name> <description>",
    "group get <name>",
    "user add <user: user> <data>",
    "user get <user: user>"
])
.action({
    "group add": i => {
        const name = i.options.getString("name");
        const description = i.options.getString("description");

        opts.groups.push({ name, description });

        i.reply(`Added group *${name}*.`);
    },
    "group get": i => {
        const group = opts.groups.find(o => o.name == i.options.getString("name"));

        if (!group) i.reply(`Unable to find group with that name.`);
        else i.reply(`Found *${group.name}* with description: ${group.description}`);
    },
    "user add": i => {
        const name = i.options.getUser("user").tag;
        const data = i.options.getString("data");

        opts.users.push({ name, data });

        i.reply(`Added user *${name}*.`);
    },
    "user get": i => {
        const user = opts.users.find(o => o.name == i.options.getUser("user").tag);

        if (!user) i.reply(`Unable to find data for that user.`);
        else i.reply(`Found data for *${user.name}*: ${user.data}`);
    }
});