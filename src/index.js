const VidarCommand = require("./command");
const VidarHandler = require("./handler");
const ErrorChecks = require("./errors");

module.exports = class Vidar {

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
     * @param {Object} opts
     * @param {import("discord.js").Client} opts.client - Your Discord.js Client.
     * @param {String} opts.commandPath - The absolute path to a file or folder of files containing your commands. Supports .js, .cjs, .mjs, .ts files and folders containing those files at any nest level.
     * @param {String[]} [opts.debugGuilds] - An optional array of guild IDs to test all of your commands ins. For use during development only, do not use this while in production. Enables some debug messages.
     */
    static initialize({ client, commandPath, debugGuilds = undefined }) {

        client.once("ready", async () => {
            await this.loadFiles(commandPath);
            if (debugGuilds) VidarHandler.debugGuilds(debugGuilds);
            VidarHandler.initialize(client, debugGuilds);
            await VidarHandler.initialized;
            if (!commandPath && !VidarHandler.size) console.warn("VidarWarn: No commands were loaded. This may be because you did not provide initialize() with the path to your command file or a folder containing command files.");
        });
    }

    /**
     * Loads a bot token from a JSON file.
     * 
     * ONLY FOR INTERNAL TESTING/DEBUGGING PURPOSES.
     * NOT RECOMMENDED TO USE IN PRODUCTION.
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
     * Utility to load a file, or recursively load all files and subfolders within a folder.
     * Used internally by initialize() to load command files.
     */
    static async loadFiles(dir) {
        dir = dir.replace("C:", "").replace(/\\/g, "/");

        ErrorChecks.pred(() => !require("fs").existsSync(dir), `Invalid path to command file/directory '${dir}' provided.\nBe sure to use an absolute path, such as 'Vidar.dirname() + "/commands"'`);

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

    /**
     * Utility to dynamically get the directory filepath of the file this property is used in.
     * Alternative to CJS' __dirname, for ESM and CJS modules.
     * 
     * Should work for all operating systems. Tested only in Windows and Ubuntu.
     * This utility was derived from the latest version of the Sifbase module.
     * 
     * @example
     * // Path to current folder
     * const dir = Vidar.dirname();
     * 
     * // Path to a JSON file in the same folder
     * const path = Vidar.dirname() + "/other.json";
     * 
     * @returns {String} Directory filepath.
     */
    static dirname() {
        // eslint-disable-next-line no-undef
        const platform = process.platform;
        const rawPath = new Error().stack.split("\n")[2].trim().split("(").slice(1).join("(").split(":").slice(0, -2).join(":").replace(/\\/g, "/").split("/").slice(0, -1).join("/");
        let encodedPath = rawPath;

        if (platform === "win32") {
            encodedPath = rawPath.split("C:").slice(1).join("C:");
        }

        return decodeURIComponent(encodedPath);
    }

    /**
     * A unique value representing a default value in Vidar methods.
     * @returns {String}
     */
    static get def() {
        return "$vidardefault";
    }

    /**
     * Utility to construct an object mapping all argument names to their values, given a chat input interaction.
     * Simplifies retrieving argument values in command actions/handlers.
     * @param {import("discord.js").ChatInputCommandInteraction} interaction 
     */
    static args(interaction) {
        const args = {};
        const { ApplicationCommandOptionType } = require("discord-api-types/v10");

        function handle(data) {
            for (const layer of data) {
                if (layer.type == ApplicationCommandOptionType.SubcommandGroup && interaction.options.getSubcommandGroup(false) == layer.name) return handle(layer.options);
                if (layer.type == ApplicationCommandOptionType.Subcommand && interaction.options.getSubcommand(false) == layer.name) return handle(layer.options);
                if (interaction.options.get(layer.name, false)) args[layer.name] = layer.value;
            }
        }

        handle(interaction.options.data);
        return args;
    }
}