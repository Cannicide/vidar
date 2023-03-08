const { PermissionsBitField, Collection } = require("discord.js");

class SyntaxParser {

    static dearg(arg) {
        let deargRegex = /(<|\[|\()|(>|\]|\))/gm;
        let dearged = arg.replace(deargRegex, "").replace(/\+/g, " ");
        let split = dearged.split(": ");
        
        return {
            name: split[0],
            type: split[1] ?? "string" //String type if no type is provided
        };
    }
    
    static components(syntax) {
        let comps = [];
        let matcher = (" " + syntax).match(/((<|\[|\()([^[<(]+)(>|\]|\)))|( [^[<( ]+)/gm);

        if (matcher && Array.isArray(matcher)) {
            matcher.forEach((arg, index) => {
            
                let builtArg = SyntaxParser.buildArgument(arg, index, matcher.length);
                comps.push(builtArg);
        
            });
        }
        
        return comps;
    }

    static buildArgument(arg, index, length) {
        let builtArg = {};
                
        if (arg.startsWith("<") || (!["<", "[", "("].includes(arg[0]) && (index || (index == 0 && length == 1)))) {
            //Mandatory arg
            builtArg.type = "arg";
            builtArg.optional = false;
            builtArg.name = this.dearg(arg).name;
            builtArg.datatype = this.dearg(arg).type;
        }
        else if (arg.startsWith("[")) {
            //Optional arg
            builtArg.type = "arg";
            builtArg.optional = true;
            builtArg.name = this.dearg(arg).name;
            builtArg.datatype = this.dearg(arg).type;
        }
        else {
            //Subgroup or subcommand or command (staticArg not supported via command syntax)

            if (index > 1) throw new Error("Subgroups and subcommands can only be used as the first two arguments of a command.");

            builtArg.type = "command";
            builtArg.name = arg.slice(1);
        }

        return builtArg;
    }

}


class SyntaxBuilder {

    static autocompleteMap = new Map();
    static initialized = false;
    static client = null;

    data = {
        command: null,
        description: "",
        arguments: [],
        type: "",
        autocomplete: new Map(),
        choices: new Map(),
        defaults: new Map(),
        requires: new Collection(),
        channels: new Set(),
        guilds: new Set(),
        action: () => {},
        json: null
    }

    constructor(commandName, description) {
        this.setCommand(commandName, description);
    }

    /**
     * @deprecated
     */
    getFillerDescription() {
        console.warn(`
            WARNING: A filler description was used by a command. This is not recommended.
            Filler descriptions are used when descriptions are not provided for commands, subcommands, or arguments.
            The Discord API requires descriptions to be provided for these entities. Fillers are used to avoid errors.
            If you are seeing this message, you did not set a description on one of your commands, subcommands, or arguments.
            Please correct this issue ASAP. Fillers are deprecated and may be removed in a future release.
        `);
        return "No description provided.";
    }

    setCommand(commandName, description) {
        if (this.data.command) throw new Error("Command already set.");
        this.data.command = commandName;
        this.setDescription(description);
    }

    setDescription(description = this.getFillerDescription()) {
        if (!description) return;
        if (this.data.description) throw new Error("Error: Command already has a description set.");

        this.data.description = description;
    }

    addSubcommand(subcommandName, description = this.getFillerDescription()) {
        if (!this.data.command) throw new Error("Error: Cannot add a subcommand before command is set.");
        this.data.arguments.push({
            type: "command",
            name: subcommandName,
            description,
            subarguments: []
        });
    }

    addArgument({name, description = this.getFillerDescription(), autoComplete, choices, defaultValue = false, max, min}) {
        if (!this.data.command) throw new Error("Error: Cannot add an argument before command is set.");
        if (!name) throw new Error("Error: Failed to specify command name.");

        let args = SyntaxParser.components(name);
        let parsedArg = {};
        let subcommandIndex = -1;
        let parsedSubcommand = null;

        if (args.length < 1) throw new Error("Error: Invalid argument name '" + name + "' used.");
        if (autoComplete && typeof autoComplete !== "function") throw new Error("Error: A function must be specified for autoComplete in arguments.");
        if (autoComplete && choices) throw new Error("Error: Autocomplete and choices cannot both be defined in a single argument.");

        for (let arg of args) {
            if (arg.type == "command") {
                subcommandIndex = this.data.arguments.findIndex(a => a.type == "command" && a.name == arg.name);
                if (subcommandIndex < 0) {
                    this.addSubcommand(arg.name);
                    subcommandIndex = this.data.arguments.length - 1;
                }

                parsedSubcommand = arg;

                continue;
            }

            parsedArg = {
                type: arg.type,
                datatype: arg.datatype,
                optional: arg.optional,
                name: arg.name,
                description,
                max,
                min
            };

            if (subcommandIndex > -1) this.data.arguments[subcommandIndex].subarguments.push(parsedArg);
            else this.data.arguments.push(parsedArg);
        }

        if ((max || min) && !["num", "number", "float", "int", "intg", "integer"].includes(parsedArg.datatype.toLowerCase())) {
            parsedArg.datatype = "int";
        }

        if (autoComplete) this.data.autocomplete.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, autoComplete);
        if (choices) this.data.choices.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, choices);
        if (defaultValue && parsedArg.optional) this.data.defaults.set((parsedSubcommand ? `${parsedSubcommand.name}:` : "") + parsedArg.name, defaultValue);
    }

    addRequire(permOrRoleName) {
        if (!this.data.command) throw new Error("Error: Cannot add a require before command is set.");

        const perms = Object.keys(PermissionsBitField.Flags);
        let value = {
            value: permOrRoleName.replace("@", "")
        };

        if (perms.includes(permOrRoleName.toUpperCase()) && !permOrRoleName.startsWith("@")) value.perm = true;
        else value.role = true;

        this.data.requires.set(value, value);
    }

    addChannel(channel) {
        if (!this.data.command) throw new Error("Error: Cannot add a channel before command is set.");

        this.data.channels.add(channel);
    }

    addGuild(guild) {
        if (!this.data.command) throw new Error("Error: Cannot add a guild before command is set.");

        this.data.guilds.add(guild);
    }

    setAction(method) {
        if (!this.data.command) throw new Error("Error: Cannot set action before command is set.");

        this.data.action = method;
    }

    setType(type = "CHAT_INPUT") {
        this.data.type = type;
    }

    build() {
        this.data.type = this.data.type || "CHAT_INPUT"; // CHAT_INPUT = slash commands
        const data = this.data;

        return data;
    }

    static getGuilds(structure, ...ids) {
        if (ids.flat().length) return structure.guilds.cache.filter(g => ids.flat().includes(g.id));
        return structure.guilds.cache;
    }

    static initializeAutocomplete(client) {

        client.on("interactionCreate", async interaction => {
            if (!interaction.isAutocomplete()) return;
            let command = interaction.commandName;
            let autocompletes = SyntaxCache.get(command)?.autocomplete;
            if (!autocompletes?.size) return;

            let sub = interaction.options.data.find(arg => arg.type == "SUB_COMMAND") ? interaction.options.getSubcommand() : null;
            let arg = interaction.options.data.find(arg => sub ? arg.options.find(arg => autocompletes.has(`${sub}:` + arg.name)) : autocompletes.has(arg.name));

            if (sub) arg = arg.options.find(arg => autocompletes.has(`${sub}:` + arg.name));

            if (arg) {
                let result = await autocompletes.get((sub ? `${sub}:` : "") + arg.name)(arg, interaction);
                if (!result || !Array.isArray(result)) interaction.respond([]);
                else interaction.respond(result.map(key => ({name: key, value: key})));
            }
        });
    }

    static async initializeCommands(client, commandConfig) {

        this.client = client;
        this.config = commandConfig;

        // Add development config-mode testing guilds, if applicable:
        if (commandConfig.mode == "development") {
            for (const command of SyntaxCache.all().values()) {
                for (const guild of commandConfig.testGuilds) {
                    if (!command.guilds.has(guild)) command.guilds.add(guild);
                }
            }
        }

        // Filter out and separate application and guild commands:
        const [ applicationCommands, guildCommands ] = SyntaxCache.all().partition(c => !c.guilds.size);

        console.log("A:", applicationCommands.size, "B:", guildCommands.size);

        // Set application commands:
        if (applicationCommands.size) await client.application?.commands?.set(applicationCommands.map(c => c?.json).map(j => {
            SyntaxCache.debug("ADDED GLOBAL COMMAND:", j.name);
            return j;
        }));

        // Set guild commands:
        const guilds = guildCommands.map(c => [...c.guilds.values()]).flat();
        for (const guild of SyntaxBuilder.getGuilds(client, guilds).values()) await guild?.commands?.set(guildCommands.filter(c => c.guilds.has(guild.id)).map(c => c?.json).map(j => {
            SyntaxCache.debug(`ADDED GUILD <${guild.id}> COMMAND:`, j.name);
            return j;
        }));

        // Setup command listener:
        client.on("interactionCreate", async interaction => {
            if (!interaction.isCommand() && !interaction.isContextMenu()) return;
            let command = SyntaxCache.get(interaction.commandName);
            if (!command) return;

            const channels = command.channels;
            const [ perms, roles ] = command.requires.partition(req => req.perm).map(x => x?.map(y => y?.value));
            const action = command.action;

            if (channels.size && !channels.some(c => c && (c == interaction.channel?.name || c == interaction.channel?.id))) return interaction.reply("> **You cannot use this command in this channel.**", true);
            if (!perms.every(p => interaction.member?.permissions.has(p))) return interaction.reply("> **You do not have the necessary perms to use this command.**", true);
            if (roles.length > 0 && !interaction.member?.roles.cache.hasAll(roles)) return interaction.reply("> **You do not have the necessary roles to use this command.**", true);

            action(interaction);
        });

        return true;

    }

    static async postInitializeCommand(command) {
        const client = this.client;
        const config = this.config;
        if (!client || !command?.json) return;

        // Add development config-mode testing guilds, if applicable:
        if (config.mode == "development") {
            for (const guild of config.testGuilds) {
                if (!command.guilds.has(guild)) command.guilds.add(guild);
            }
        }

        if (command.guilds.size) {
            // Add guild command:
            for (const guild of SyntaxBuilder.getGuilds(client, [...command.guilds.values()]).values()) {
                const output = await guild?.commands?.create(command.json);
                if (!output) return;
                SyntaxCache.debug(`ADDED GUILD <${guild.id}> COMMAND:`, command.json.name)
            }
        }
        else {
            // Add application command:
            
            const output = await client.application?.commands?.create(command.json);
            if (!output) return;
            SyntaxCache.debug("ADDED GLOBAL COMMAND:", command.json.name)
        }
    }

}

class SyntaxCache {
    
    static #cache = new Collection();

    static get(commandName) {
        return this.#cache.get(commandName) ?? null;
    }

    static async set(commandName, command) {
        this.#cache.set(commandName, command);
        console.log("ADDED TO CACHE:", commandName);
        if (await SyntaxBuilder.initialized) SyntaxBuilder.postInitializeCommand(command);
    }

    static all() {
        return this.#cache;
    }

    static #attachments = new Map();

    static addResolvedAttachments(interactionId, attachmentsObject) {
        this.#attachments.set(interactionId, new Map(Object.entries(attachmentsObject)));
    }

    static getResolvedAttachment(interactionId, attachmentId) {
        return this.#attachments.get(interactionId)?.get(attachmentId);
    }

    static debug(...m) {
        if (SyntaxBuilder.config.mode == "development") console.log(...m);
    }
}

module.exports = {
    SyntaxBuilder,
    SyntaxParser,
    SyntaxCache,
    initialize(client, commandConfig) {
        SyntaxBuilder.initializeAutocomplete(client);
        // @ts-ignore
        SyntaxBuilder.initialized = SyntaxBuilder.initializeCommands(client, commandConfig);
    }
}