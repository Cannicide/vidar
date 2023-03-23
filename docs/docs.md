# Vidar Documentation
Most major components of [Vidar](https://www.npmjs.com/package/djs-vidar) by Cannicide are documented here.\
These docs are built into the package, and are thus available offline.

## Get Started
Install Vidar using npm:

```
npm install djs-vidar
```

In your main file, import the module after importing discord.js:

```js
const { Client } = require("discord.js");
const Vidar = require("djs-vidar");

const client = new Client({
    intents: [ /* insert your intents here */ ]
});
```

After creating your discord.js `client`, initialize Vidar:

```js
Vidar.initialize({
    client, // The 'client' variable
    commandPath: Vidar.dirname() + "/commands", // The path to a command file or folder of commands to load
});
```

`commandPath` accepts the absolute path to a file or folder containing your commands.\
When a folder is provided, all `.js`, `.cjs`, `.mjs`, and `.ts` files inside it are loaded. (Note: only .js files have been tested).\
The `commandPath` can work in various formats, here are a couple examples -

Single file containing all commands (path is `/commands.js`):\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_path1.png" />

Folder containing multiple command files (path is `/commands`):\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_path2.png" />

Folder containing command files and any depth of nested folders (path is `/commands`):\
<img src="https://raw.githubusercontent.com/Cannicide/vidar/main/docs/images/command_path3.png" />

Now you are ready to start creating [commands](https://github.com/Cannicide/vidar/tree/main/docs/commands/commands.md).

## Additional Options

### Debug Mode
Initialization also supports a debugging mode, which enables additional debug-related message logging and publishes all commands solely to specified testing guilds. Enabling this mode is useful for testing commands, and may assist in identifying the causes of the issues.

To enable debugging mode, provide the `initialize()` method with an array of `debugGuilds`. This will cause all commands to be published solely to the guilds with the IDs you provide. This is effectively the same as using `.guilds()` on every command, but is included in initialization as a useful shortcut.

```js
Vidar.initialize({
    client,
    commandPath: Vidar.dirname() + "/commands",
    debugGuilds: ["668485643487412234"]
});
```

### Post-Processing
Normally, initialization automatically publishes all commands when the Client's `ready` event triggers. In some cases, however, you may want some commands to be created and published much after the `ready` event. Fortunately, the `command()` method inherently supports post-processing if called after the `ready` event. However, this will only work if the `command()` method is being called in a file that is running, has been imported, or is loaded by the `commandPath` of `initialize()`. If you have a command that needs post-processing but is within an uninitialized/unimported file or folder, Vidar provides a simple utility to load commands in files and folders: [loadFiles()](https://github.com/Cannicide/vidar/tree/main/docs/utilities.md#loadFiles).