const VidarCommand = require("./command");
const SyntaxHandler = require("./syntax");

module.exports = class VidarHandler {

    /**
     * Creates a new slash command with the given name and description.
     * @param {String} name - The name of the command.
     * @param {String} description - The description of the command.
     */
    static command(name, description) {
        return new VidarCommand(name, description);
    }

    /**
     * Initializes VidarHandler. This method must be called to create, update, and handle your commands.
     * @param {import("discord.js").Client} client - Your Discord.js Client.
     * @param {String} commandPath - The absolute path to a file or folder of files containing your commands. Supports .js, .cjs, .mjs, .ts files and folders containing those files at any nest level.
     * @param {String[]} [debugGuilds] - An optional array of guild IDs to test all of your commands ins. For use during development only, do not use this while in production. Enables some debug messages.
     */
    static initialize(client, commandPath, debugGuilds = undefined) {
        const options = { mode: "production", testGuilds: [] };
        if (debugGuilds && Array.isArray(debugGuilds) && debugGuilds.length > 0) {
            options.mode = "development";
            options.testGuilds = debugGuilds;
        }

        if (!commandPath) throw new Error("Error: You did not specify the path to your command file or a folder containing command files.");

        client.once("ready", async () => {
            await this.loadFiles(commandPath);
            SyntaxHandler.initialize(client, options)
        });
    }

    /**
     * Loads a bot token from a JSON file.
     * @private
     */
    static loadToken(JSONpath) {
        const fs = require('fs');
        if (!fs.existsSync(JSONpath)) return null;
        const { token } = require(JSONpath);
        return token;
    }

    /**
     * Gets all intents.
     * 
     * ONLY FOR INTERNAL TESTING/DEBUGGING PURPOSES.
     * NOT RECOMMENDED TO USE IN PRODUCTION.
     * @private
     * @returns {import("discord.js").BitFieldResolvable<?, ?>}
     */
    static allIntents() {
        return Object.values(require("discord.js").IntentsBitField.Flags);
    }

    /**
     * Loads a file, or recursively loads all files and subfolders within a folder.
     * Used internally by initialize() to load command files.
     * @private
     */
    static async loadFiles(dir) {
        dir = dir.replace("C:", "").replace(/\\/g, "/");

        if (!require("fs").lstatSync(dir).isDirectory()) return this.loadFile(dir);
        let files = require("fs").readdirSync(dir);

        for (const file of files) {
            let path = dir + "/" + file;
            if (require("fs").lstatSync(path).isDirectory()) {
                await this.loadFiles(path);
            } else if (path.endsWith(".js") || path.endsWith(".cjs") || path.endsWith(".mjs") || path.endsWith(".ts")) {
                await this.loadFile(path);
            }
        }
    }

    /**
     * Loads a single file.
     * Used internally by loadFiles() to load command files.
     * @private
     */
    static async loadFile(path) {
        await import(path);
    }

}