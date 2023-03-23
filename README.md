# djs-vidar
An extremely simplistic method-based slash command handler for Discord.js v14.\
The successor to the powerful `elisif` framework.

## Usage
Install Vidar using npm:

```
npm install djs-vidar
```

See [the docs](https://github.com/Cannicide/vidar/tree/main/docs/docs.md) for full usage information.

## Basic Comparison
Most slash command handlers I've encountered are, in my opinion, more complicated than necessary. They usually have either massive nested object literals, or a dozen lines worth of methods (with an individual method for each property of a command) for creating basic commands. I sought to simplify that immensely, so I created a module called `elisif` (and an extension of it called `elisif-simple`) for Discord.js v13 that used a basic command syntax to make the process a little simpler. Now, I have created a far simpler syntax system with far more advanced functionality to make the process as simple as it can get, all with support for the latest version of Discord.js v14 -- and `djs-vidar` is much easier to keep updated than the bloated `elisif` module.

Here's a comparison between Discord.js' built-in command-building system and Vidar's highly simplified system.\
Here's Discord.js:
```js
module.exports = {
    data: new SlashCommandBuilder()
        .setName('gif')
        .setDescription('Sends a random gif!')
        .addStringOption(option =>
            option.setName('category')
            .setRequired(true)
            .addChoices(
                { name: 'Funny', value: 'Funny' },
                { name: 'Meme', value: 'Meme' },
                { name: 'Movie', value: 'Movie' },
            )
        )
        .addChannelOption(option =>
            option.setName('output')
            .setRequired(false)
        ),
    execute: i => {
        i.reply('Some gif.');
    }
}
```

And here's Vidar:
```js
command("gif", "Sends a random gif!")
.argument("<category: Funny | Meme | Movie> [output: channel]")
.action(i => {
    i.reply("Some gif");
});
```

As you can see, Vidar makes command creation much simpler, and does not require exports.

## Credits
[Vidar](https://www.npmjs.com/package/djs-vidar) was created by **Cannicide**\
Current dependencies: [discord.js](https://www.npmjs.com/package/discord.js) (v14), [discord-api-types](https://www.npmjs.com/package/discord-api-types) (API v10)