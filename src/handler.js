const { Collection } = require("discord.js");

class VidarHandler {
    
    /**
     * @type {import("discord.js").Collection<string, import("./command")>}
     */
    static #cache = new Collection();
    static initialized = false;
    /**
     * @type {import("discord.js").Client}
     */
    static client = null;
    static #debug;
    static #testGuilds = [];

    static size() {
        return this.#cache.size;
    }

    /**
     * 
     * @param {import("discord.js").Client} client 
     * @param {Boolean} debug 
     */
    static initialize(client, debug) {
        this.client = client;
        this.#debug = debug;

        this.initializeAutocomplete();
        this.initialized = this.initializeCommands();
    }

    static debugGuilds(testGuilds) {
        this.#testGuilds = testGuilds;

        for (const command of this.#cache.values()) {
            for (const guild of testGuilds) {
                if (!command.data.guilds.has(guild)) command.data.guilds.add(guild);
            }
        }
    }

    static getCommand(commandName) {
        return this.#cache.get(commandName) ?? null;
    }

    /**
     * 
     * @param {string} commandName 
     * @param {import("./command")} command 
     */
    static async setCommand(commandName, command) {
        this.#cache.set(commandName, command);
        console.log("ADDED TO CACHE:", commandName);
        if (await this.initialized) this.postInitializeCommand(command);
    }

    static debug(...m) {
        if (this.#debug) console.log(...m);
    }

    static getGuilds(...ids) {
        if (ids.flat().length) return this.client.guilds.cache.filter(g => ids.flat().includes(g.id));
        return this.client.guilds.cache;
    }

    static initializeAutocomplete() {

        this.client.on("interactionCreate", async interaction => {
            if (!interaction.isAutocomplete()) return;
            
            let autoCompleteMap = this.getCommand(interaction.commandName)?.data.autoComplete;
            if (!autoCompleteMap) return;

            const argName = interaction.options.getFocused(true).name;
            let sub = interaction.options.getSubcommand(false);
            let autoComplete;

            if (sub) autoComplete = autoCompleteMap.get(sub).get(argName);
            else autoComplete = autoCompleteMap.get(argName);

            if (autoComplete) {
                let result = await autoComplete(interaction);
                if (!Array.isArray(result)) throw new Error("VidarError: Invalid result returned by autoComplete callback. Return type should be an Array of values.");

                if (!result) interaction.respond([]);
                else interaction.respond(result.map(key => ({ name: key, value: key })));
            }
        });
    }

    static async initializeCommands() {

        // Filter out and separate application and guild commands:
        const [ applicationCommands, guildCommands ] = this.#cache.partition(c => !c.data.guilds.size);

        // Set application commands:
        if (applicationCommands.size) await this.client.application?.commands?.set(applicationCommands.map(c => c?.data.JSON).map(j => {
            this.debug("ADDED GLOBAL COMMAND:", j.name);
            return j;
        }));

        // Set guild commands:
        const guilds = guildCommands.map(c => [...c.data.guilds.values()]).flat();
        for (const guild of this.getGuilds(guilds).values()) await guild?.commands?.set(guildCommands.filter(c => c.data.guilds.has(guild.id)).map(c => c?.data.JSON).map(j => {
            this.debug(`ADDED GUILD <${guild.id}> COMMAND:`, j.name);
            return j;
        }));

        // Setup command listener:
        this.client.on("interactionCreate", async interaction => {
            if (!interaction.isChatInputCommand()) return;

            let command = this.getCommand(interaction.commandName)?.data;
            if (!command) return;

            const channels = [...command.channels.values()];
            const perms = [...command.requires.perms.values()];
            const roles = command.requires.roles;
            const action = command.action;

            if (channels.length && !channels.some(c => c && (c == interaction.channel?.name || c == interaction.channel?.id)))
                return interaction.reply({ content: "> **You cannot use this command in this channel.**", ephemeral: true });
            if (!perms.every(p => interaction.member?.permissions.has(p)))
                return interaction.reply({ content: "> **You do not have the necessary perms to use this command.**", ephemeral: true });
            if (roles.size && !interaction.member?.roles.cache.hasAll(...roles.values()))
                return interaction.reply({ content: "> **You do not have the necessary roles to use this command.**", ephemeral: true });

            action(interaction);
        });

        return true;

    }

    /**
     * 
     * @param {import("./command")} command 
     * @returns 
     */
    static async postInitializeCommand(command) {
        if (!this.client) return;

        const data = command.data;

        // Add development config-mode testing guilds, if applicable:
        if (this.#debug) {
            for (const guild of this.#testGuilds) {
                if (!data.guilds.has(guild)) data.guilds.add(guild);
            }
        }

        if (data.guilds.size) {
            // Add guild command:

            for (const guild of this.getGuilds([...data.guilds.values()]).values()) {
                const output = await guild?.commands?.create(data.JSON);
                if (!output) return;
                this.debug(`POST ADDED GUILD <${guild.id}> COMMAND:`, data.JSON.name)
                // TODO: add error catching on command creation
            }
        }
        else {
            // Add application command:
            
            const output = await this.client.application?.commands?.create(data.JSON);
            if (!output) return;
            this.debug("POST ADDED GLOBAL COMMAND:", data.JSON.name)
        }
    }
}

module.exports = VidarHandler;