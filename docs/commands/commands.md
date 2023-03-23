# Vidar Slash Commands
Vidar makes slash command creation and handling extremely simple.

## Creation
To begin creating a command, import Vidar's `command` method:
```js
const { command } = require("djs-vidar");
```
The method is fully documented with JSDoc, so using it should be fairly straightforward.\
Note that the slash command will not be published to Discord until an execution handler is added to it via `.action()`.

### Basic Command
To create a basic slash command with name "ping" and description "Gives you a pong.":
```js
command("ping", "Gives you a pong.");
```

### Execution Handling
To handle execution of the command, use `.action()`:
```js
command("ping", "Gives you a pong.")
.action(interaction => {
    interaction.reply("Pong!");
});
```
The slash command will be published to Discord once the `.action()` method is added to the command.\
Thus, `.action()` should only be called after all other command options are configured, as the last method call.

### Arguments
One or more arguments can be added to the command using `.argument()`:
```js
command("ping", "Gives you a pong.")
.argument("<name> <favcolor>") // Adds two required arguments: "name" and "favcolor"
.action(interaction => {
    const name = interaction.options.getString("name");
    const favcolor = interaction.options.getString("favcolor");
    interaction.reply("Pong! Your name is " + name + " and your favorite color is " + favcolor);
});
```

Alternatively, you can use `.arguments()` to provide an array of arguments:
```js
command("ping", "Gives you a pong.")
.arguments([
    "<name>",
    "<favcolor>"
]) // Adds two arguments: "name" and "favcolor"
.action(interaction => {
    const name = interaction.options.getString("name");
    const favcolor = interaction.options.getString("favcolor");
    interaction.reply("Pong! Your name is " + name + " and your favorite color is " + favcolor);
});
```

For more information and customization on arguments, see the [arguments documentation](https://github.com/Cannicide/vidar/tree/main/docs/commands/arguments.md).

### Perm/Role Requirements
If your command should be restricted only to users that have a specific permission or role (such as for moderation commands), use `.require()`.\
Roles should be prefixed with an `@` symbol. Both role names and IDs are accepted. Example:
```js
command("ping", "Gives you a pong.")
.require("Administrator") // Command can now only be run by people with "Administrator" permission
.require("@Admin") // And command can now only be run by people with "Admin" role
.action(interaction => {
    interaction.reply("Pong!");
});
```

Alternatively, you can use `.requires()` to provide an array of requirements:
```js
command("ping", "Gives you a pong.")
.requires(["Administrator", "@Admin"]) // Command can now only be run by people with "Administrator" permission and "Admin" role
.action(interaction => {
    interaction.reply("Pong!");
});
```

Roles and permissions are not case-sensitive, any casing will work. If more than one perm and/or role requirements are provided, the user must have ALL of the provided perms and roles in order to use the command. These requirements do not prevent users from seeing the command in the slash command menu; the requirements only prevent them from actually executing the command without the proper perms and roles.

### Channel Specifications
Like perms and roles, channel restrictions can also be specified. When specified, the command can only be run in the specified channel(s).\
Whether to prefix the channel with `#` is up to you, either works. Both channel names and IDs are accepted. Example:
```js
command("ping", "Gives you a pong.")
.channel("#general") // Command can now only be run in channels named "general"
.action(interaction => {
    interaction.reply("Pong!");
});
```

Alternatively, you can use `.channels()` to provide an array of channels:
```js
command("ping", "Gives you a pong.")
.channels(["#general", "883731756438671391"]) // Command can now only be run in channels named "general" or with ID "883731756438671391"
.action(interaction => {
    interaction.reply("Pong!");
});
```

Like perms and roles, provided channel names are not case-sensitive, any casing will work. If more than one channel is provided, the user must be running the command in ANY of the provided channels in order to use the command. These specifications do not prevent users from seeing the command in the slash command menu; the specifications only prevent them from actually executing the command without being in the proper channels.

### Guild Specifications
Self-explanatory, method usage works the same as channel specifications. Only guild IDs are accepted:
```js
command("ping", "Gives you a pong.")
.guild("668485643487412234") // Command will be published only to guild with ID "668485643487412234"
.action(interaction => {
    interaction.reply("Pong!");
});
```

Alternatively, you can use `.guilds()` to provide an array of guilds:
```js
command("ping", "Gives you a pong.")
.guilds(["668485643487412234", "443965931002134550"]) // Command will be published only to guilds with IDs "668485643487412234" and "443965931002134550"
.action(interaction => {
    interaction.reply("Pong!");
});
```

Unlike channel specifications, guild names cannot be provided. This method sets the command as a guild command, meaning it will only be published in the provided guilds instead of being globally available to all guilds that have your bot. Users will not be able to see or use this command in unspecified guilds. If you want this command to be published globally to all guilds your bot is in, do not use `.guild()` or `.guilds()`.

### DM Usage
For global commands, using the command in DMs is by default enabled by Discord. If you do not want users to use the command in DMs:
```js
command("ping", "Gives you a pong.")
.dms(false) // Disables DM use
.action(interaction => {
    interaction.reply("Pong!");
});
```

This method cannot be used on guild commands, as they inherently cannot be used in DMs. If you used `.guild()` or `.guilds()` on this command, do not use `.dms()`.

### NSFW Only
If this command is NSFW in any way, enable NSFW-only mode:
```js
command("sexy", "Gives you a sexy image.")
.nsfw()
.action(interaction => {
    interaction.reply("Sending a sexy image...");
});
```

This will ensure that the command can only be seen and used in NSFW channels, and by users who are 18+ years old.

### Autocompletion
Before adding autocompletion handling, make sure to mark the desired arguments as [autocompletable](https://github.com/Cannicide/vidar/tree/main/docs/commands/arguments.md#autocompletable). To handle autocompletion on autocompletable arguments, use `.autocomplete()`:
```js
const heroes = ["wonder woman", "batman", "spiderman", "black widow"];

command("hero", "Is it a hero?")
.argument("<*name>") // Add an autocompletable argument named "name"
.autocomplete({
    "<*name>": i => {
        const query = i.options.getFocused();
        return heroes.filter(hero => hero.includes(query.toLowerCase())); // Autocomplete with array of heroes that partly or fully match query
    }
})
.action(i => {
    const name = i.options.getString("name");
    const value = heroes.some(hero => hero == name.toLowerCase());
    if (value) i.reply(name + " is a hero!");
    else i.reply(name + " is not a hero!");
});
```

The `.autocomplete()` method can contain the autocomplete handlers for every autocompletable argument, with each argument name mapped to its associated handler.\
For a slightly more advanced example of autocompletion, see the [autocomplete tests](https://github.com/Cannicide/vidar/tree/main/test/commands/autocomplete.js).

### Documentation
You may have noticed that in argument creation, the arguments are missing their descriptions. Discord requires descriptions for all arguments, so forcing descriptions to be added to every argument in syntax would be long, verbose, and ugly. To keep syntax short and sweet, argument descriptions are documented separately via `.docs()`.

The following format example is made for the command from the earlier [arguments section](https://github.com/Cannicide/vidar/tree/main/docs/commands/commands.md#arguments) of this page:
```json
{
    // Ping command example:
    "ping": {
        "<name>": "Your name.",
        "<favcolor>": "Your favorite color."
    },

    // Basic example:
    "commandname": {
        "<arg1>": "Description of arg1.",
        "<arg2>": "Description of arg2."
    },

    // Localizations example:
    "anothercmd": {
        "<arg1>": "Default description of arg1 in all languages.",
        "<arg2>": {
            "default": "Default description of arg2.",
            "en-US": "USA description of arg2.",
            "en-GB": "UK description of arg2.",
            "fr": "La description de arg2 en France."
        }
    }
}
```
The above example documents the descriptions of the arguments for three commands: one named "ping", another named "commandname", and another named "anothercmd". The format inherently supports documentation of multiple commands at once, so you can use a single Object literal or JSON file to document all commands. To actually take the above documentation and apply it to a command, use `.docs()`:
```js
command("ping", "Gives you a pong.")
.docs({
    "ping": {
        "<name>": "Your name.",
        "<favcolor>": "Your favorite color."
    }
}) // Adds descriptions to "name" and "favcolor" arguments
.argument("<name> <favcolor>")
.action(interaction => {
    const name = interaction.options.getString("name");
    const favcolor = interaction.options.getString("favcolor");
    interaction.reply("Pong! Your name is " + name + " and your favorite color is " + favcolor);
});
```
Or, more conveniently, you can put the contents of the earlier format example into a JSON file, and then provide the absolute path to the file to `.docs()`. So if you saved the format example in a file called `docs.json`:
```js
const { dirname } = require("djs-vidar");

command("ping", "Gives you a pong.")
.docs(dirname() + "/docs.json") // Adds descriptions to "name" and "favcolor" arguments
.argument("<name> <favcolor>")
.action(interaction => {
    const name = interaction.options.getString("name");
    const favcolor = interaction.options.getString("favcolor");
    interaction.reply("Pong! Your name is " + name + " and your favorite color is " + favcolor);
});
```
For information on what `dirname` does here, see the [utilities documentation](https://github.com/Cannicide/vidar/tree/main/docs/utilities.md#dirname).\
For an example on multiple commands being documented by one JSON file, see the tests' [ping command](https://github.com/Cannicide/vidar/tree/main/test/commands/ping.js) and [docs JSON](https://github.com/Cannicide/vidar/tree/main/test/commands/docs.json).

Note that you do not *need* to use documentation or `.docs()`. If you choose not to, any arguments and subcommands attached to the command will simply have "No description provided" as a filler description -- this is to avoid Discord throwing errors when required descriptions are not provided. However, using this documentation process is highly recommended, as it is a good idea to properly describe all of your arguments. The filler description process is also a deprecated functionality, and may be removed in future versions of Vidar.

### Advanced Execution Handling
If your command has several subcommands or subgroups, `.action()` has an alternative format that makes it possible to create separate execution handlers for them:
```js
command("colorpicker", "Set and get a color.")
.argument("set <color> [msg]")
.argument("get")
.action({
    "set": i => {
        // Handles '/colorpicker set <color> [msg]'
        color = i.options.getString("color");
        const msg = i.options.getString("msg", false);
        i.reply("Set color to " + color + "! " + (msg ?? ""));
    },
    "get": i => {
        // Handles '/colorpicker get'
        if (color) i.reply("Color is " + color + "!");
        else i.reply("Set the color first!");
    }
});
```
You can create separate execution handlers for:
- Subcommands
- Entire subgroups
- A specific subcommand in a subgroup
- Any of the above + a default handler to handle all other subcommands/subgroups

## Error Handling
Vidar has extensive error-checking and handling to catch most errors/issues before commands are published. Without this, repeatedly trying to publish commands with errors would hit rate limits.

### Invalid Creation
Vidar's command creation errors identify issues and explain them to you -- preventing the command from being published until the issue is resolved. Failure to provide required information, providing incorrect datatypes, using mutually exclusive options, and more are among the issues that Vidar throws an informative error for. If you see a `VidarError`, it will usually point to the cause of the problem and may inform you of how to fix the problem if not self-explanatory. Resolving the issues will allow the command to be successfully created and published.

### Missing Requirements
If a user is missing a permission or role when trying to run a command, Vidar automatically responds with the following message:\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_err1.png" />

### Invalid Channel
If a command has channel specifications and a user tries to run it in the wrong channel, Vidar automatically responds with the following message:\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_err2.png" />

### Execution Errors
If an error occurs in your command execution method, and your bot hasn't replied to the interaction yet, Vidar automatically responds with the following message before the error is thrown:\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_err3.png" />

This message works for deferred interactions as well. This error handling prevents them from waiting a long time only to see Discord's default "The application did not respond" message, which would usually occur in the event of an error in your code.

### Message Customization
At the moment, Vidar's error messages for missing requirements, invalid channels, and execution errors are neither customizable nor toggleable. However, support for customizing these messages and being able to fully disable them is planned for a [future update](https://github.com/Cannicide/vidar/tree/main/docs/changelog.md#next).

## Examples
For a full example of a bot with commands using Vidar, see the [tests](https://github.com/Cannicide/vidar/tree/main/test/).
To make the example fully functional, replace all occurrences of `require("../src/index")` and `require("../../src/index")` with `require("djs-vidar")`.