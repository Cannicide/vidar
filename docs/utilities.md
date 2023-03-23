# Vidar Utilities
A few utilities included in the package to assist with command creation and handling.

## dirname
Gets the absolute path to the directory of the current file. Like `__dirname`, but works in both ESM and CommonJS.

For example, for the script `C:/commands/economy/casino.js`:
```js
Vidar.dirname(); // => "C:/commands/economy"
```

## loadFiles
Loads commands within a file or all commands anywhere within a folder. When a folder is provided, command-loading is recursive. In other words, it will load all folders within the folder, and all folders within those folders, to load all commands. Use [Vidar.dirname()](https://github.com/Cannicide/vidar/tree/main/docs/utilities.md#dirname) to help get the absolute path to a file.

Example:
```js
// Recursively load all commands anywhere within folder named "commands2":
Vidar.loadFiles(Vidar.dirname() + "/commands2");

// Or load a single command file named "somecmd.js":
Vidar.loadFiles(Vidar.dirname() + "/somecmd.js");
```

## def
A property representing a default value, used to specify default actions in various Vidar methods.

Example:
```js
action({
    [Vidar.def]: interaction => { /* ...default interaction handler stuff */ }
});
```

## args
A utility method to facilitate retrieving argument values from a discord.js `ChatInputCommandInteraction`.\
For example, in the handler of a command such as `/color <background> <foreground>` -

Getting argument values using plain discord.js:
```js
interaction => {
    const background = interaction.options.getString("background");
    const foreground = interaction.options.getString("foreground");
}
```

Versus using args() utility:
```js
interaction => {
    const { background, foreground } = Vidar.args(interaction);
    // Much simpler and less verbose!
}
```