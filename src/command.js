const VidarSyntax = require("./syntax");
const {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    PermissionsBitField,
} = require("discord.js");
const { ArgTypes, SubTypes } = require("./types");
const VidarHandler = require("./handler");
const ErrorChecks = require("./errors");

/**
 * A method that executes a command, given an interaction.
 * @callback VidarAction
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 */

/**
 * A method that returns autocomplete results, given an interaction.
 * @callback VidarAutoComplete
 * @param {import("discord.js").AutocompleteInteraction} interaction
 * @returns {*[]}
 */

/**
 * A map of subcommands/subgroups to action methods.
 * @typedef {Object<string,VidarAction>} VidarActionMap
 */

/** 
 * The syntax of an argument to a Vidar command.
 * @typedef {String} VidarArgument
 */

/**
 * Whether this sub-element is a subcommand, subgroup, or contains both.
 * @typedef {String} VidarSubType
 */

/**
 * Util function for checking if a value is defined.
 */
function isDefined(value) {
    return value !== null && typeof value !== "undefined";
}

class VidarCommand {

    builder = new SlashCommandBuilder();
    #documented = false;

    /**
     * @private
     */
    data = {
        subs: /** @type {Map<string, import("discord.js").SlashCommandSubcommandBuilder|import("discord.js").SlashCommandSubcommandGroupBuilder|import("discord.js").SlashCommandStringOption>} */ (new Map()),
        autoComplete: new Map(),
        requires: {
            perms: new Set(),
            roles: new Set()
        },
        channels: new Set(),
        guilds: new Set(),
        docs: null,
        action: /** @type {VidarAction} */ (() => {}),
        JSON: null
    }

    constructor(name, description) {
        this.commandName(name);
        this.commandDescription(description);
    }

    /**
     * Documents the command's argument names mapped to descriptions and localizations, via JSON file or JSON-compatible Object literal.
     * The provided JSON can contain data for more than one command, facilitating the documentation of multiple commands with one JSON file.
     * 
     * This method, docs(), can be called before or after argument creation.
     * @example
     * docs({
     *  // Basic documentation of command 'cmd1':
     *  "cmd1": {
     *      // Descriptions of '/cmd1 group add <name> <description>' and '/cmd1 group get <name>':
     *      "group add": "Adds a group.",
     *      "group add <name>": "The name of the group to add.",
     *      "group add <description>": "The description of the group to add.",
     *      "group get": "Gets a group.",
     *      "group get <name>": "The name of the group to get.",
     * 
     *      // Descriptions of '/cmd1 user add <user> <data>' and '/cmd1 user get <user>':
     *      "user add": "Adds a user.",
     *      "user add <user>": "The user to add.",
     *      "user add <data>": "The data of the user.",
     *      "user get": "Gets a user.",
     *      "user get <user>": "The user to get."
     *  },
     * 
     *  // Documentation of command 'cmd2' with localizations:
     *  "cmd2": {
     *      // Descriptions of '/cmd2 group add <name> <description>' and '/cmd2 group get <name>':
     *      "group add": "Adds a group.",
     *      "group add <name>": {
     *          "en-US": "The name of the group to add.",
     *          "en-UK": "The name of the group to add, chap."
     *      },
     *      "group add <description>": "The description of the group to add.",
     *      "group get": "Gets a group.",
     *      "group get <name>": "The name of the group to get."
     *  }
     * });
     * 
     * @param {string|Object<string, Object<string, string|import("discord-api-types/v10").LocalizationMap>>} json - Absolute path to a JSON file, or an Object literal, containing documentation data for one or more commands.
     * @returns 
     */
    docs(json) {
        if (this.#documented) return this;

        ErrorChecks.noexist(json, "JSON or path to JSON was not provided to document()");
        if (typeof json === "string") {
            ErrorChecks.pred(() => !require("fs").existsSync(json), `Invalid path to JSON file '${json}' provided.\nBe sure to use an absolute path, such as 'Vidar.dirname() + "/docs.json"'`);
            json = require(json);
        }
        ErrorChecks.pred(() => !(this.builder.name in json), `The provided documentation JSON does not contain documentation for command '${this.builder.name}'`);

        this.data.docs = json[this.builder.name];
        return this;
    }

    /**
     * Sets the name of the command.
     * Used internally during construction.
     * @param {String} name - The name of the command.
     * @returns 
     * @private
     */
    commandName(name) {
        ErrorChecks.noexist(name, "Command name was not provided");
        ErrorChecks.badtype(name, "string", "command name");
        ErrorChecks.minmax(name.length, "command name length", 1, 32);
        ErrorChecks.slashname(name, "command");

        this.builder.setName(name);
        return this;
    }

    /**
     * Sets the description of the command.
     * Used internally during construction
     * @param {String} description - The description of the command.
     * @returns
     * @private
     */
    commandDescription(description) {
        ErrorChecks.noexist(description, "Command description was not provided");
        ErrorChecks.badtype(description, "string", "command description");
        ErrorChecks.minmax(description.length, "command description length", 1, 100);

        this.builder.setDescription(description);
        return this;
    }

    /**
     * Adds a subcommand or subgroup to the command.
     * Mostly useful for documenting descriptions when not using docs().
     * Used internally by docs() and rawArgument().
     * @param {String} name - The name of the subgroup, subcommand, or both combined (separated by a space).
     * @param {String} description - The description of the last subcommand or subgroup listed in 'name'.
     * @param {VidarSubType} type - Whether this sub-element is a subgroup, subcommand, or both.
     * @returns 
     * @private
     */
    addRawSub( name, description = "No description provided.", type ) {
        if (this.data.subs.has(name)) return this;

        ErrorChecks.noexist(name, "Subcommand/subgroup name was not provided");
        ErrorChecks.badtype(name, "string", "subcommand/subgroup name");
        ErrorChecks.noexist(description, "The Discord API requires subcommand/subgroup descriptions, and one was not provided");
        ErrorChecks.badtype(description, "string", "subcommand/subgroup description");
        ErrorChecks.minmax(name.length, "subcommand/subgroup name length", 1, 32);
        ErrorChecks.slashname(name, "subcommand/subgroup");

        let [ subgroup, subcommand ] = name.split(" ");
        if (subgroup && subcommand) type = SubTypes.Hybrid;

        if (type == SubTypes.Hybrid) {
            // 'subgroup' is subgroup with subcommand

            if (!this.data.subs.has(subgroup)) this.addRawSub(subgroup, subgroup + ".", SubTypes.Subgroup);
            const sub = new SlashCommandSubcommandBuilder().setName(subcommand).setDescription(description);
            this.data.subs.get(subgroup).addSubcommand(sub);
            this.data.subs.set(name, sub);

        }
        else if (subgroup && type == SubTypes.Subcommand) {
            // 'subgroup' is subcommand with no subgroup

            subcommand = subgroup;
            const sub = new SlashCommandSubcommandBuilder().setName(subcommand).setDescription(description);
            this.builder.addSubcommand(sub);
            this.data.subs.set(name, sub);

        }
        else if (subgroup && type == SubTypes.Subgroup) {
            // 'subgroup' is subgroup with no subcommand

            const sub = new SlashCommandSubcommandGroupBuilder().setName(subgroup).setDescription(description);
            this.builder.addSubcommandGroup(sub);
            this.data.subs.set(name, sub);
        }

        return this;
    }

    /**
     * Adds an argument to the command.
     * Special syntax is used to determine the argument's name, subcommand, datatype, optionality, and more.
     * The special syntax is highly simple and straightforward; see the demonstrations in the provided example.
     * 
     * Note: Autocomplete and choices are mutually exclusive, so both cannot be provided for the same argument.
     * Note: Min and max properties can only be used on number-based argument datatypes.
     * Note: When using min/max/choices, datatype is auto-inferred by Vidar.
     * @example
     * // All options demonstrated:
     * argument("subgroup subcommand <required> <choices: dog | fox | pig> [optional] [datatype: float] [*autocompletable] [maxmin: 2 < x < 5.7] [maxminlength: 1 < l < 10]");
     *
     * // Minimum options demonstrated:
     * argument("<required>");
     * 
     * @param {VidarArgument} syntax
     * @returns 
     */
    argument(syntax) {
        ErrorChecks.noexist(syntax, "Argument syntax was not provided");
        ErrorChecks.badtype(syntax, "string", "argument syntax");

        const args = VidarSyntax.parseArgument(syntax);
        args.filter(a => !a.sub).forEach(arg => this.rawArgument({
            ...arg,
            subgroup: args.find(a => a.subgroup)?.name,
            subcommand: args.find(a => a.subcommand)?.name
        }));

        if (args.every(a => a.sub)) this.rawArgument({
            subgroup: args.find(a => a.subgroup)?.name,
            subcommand: args.find(a => a.subcommand)?.name
        });

        return this;
    }

    /**
     * Adds multiple arguments to the command. Special name syntax is supported.
     * @param {VidarArgument[]} args 
     * @returns
     */
    arguments(args) {
        ErrorChecks.noexist(args, "Data of arguments were not provided");
        ErrorChecks.badtype(args, "array", "arguments data");

        args.forEach(arg => this.argument(arg));

        return this;
    }

    /**
     * Adds a raw argument to the command.
     * Special syntax is not supported by rawArgument; each option is its own property in the argument object.
     * Used internally by argument().
     * 
     * Note: Autocomplete and choices are mutually exclusive, so both cannot be specified for the same argument.
     * Note: Min and max properties can only be used on number-based argument types
     * @example
     * // All options demonstrated:
     * rawArgument({
     *  name: "name", // Name of the argument
     *  description: "A description", // The description of the argument
     *  type: "float", // Datatype of the argument
     *  optional: true, // Whether the argument is optional or required
     *  subcommand: "sub", // The subcommand this argument belongs to
     *  subgroup: null, // The subgroup this argument and its subcommand belong to
     *  choices: [1.46, 7], // Choices that the user must choose from
     *  autoComplete: true, // Autocompletable argument
     *  min: 2, // Minimum value of this float argument
     *  max: 5.7, // Maximum value of this float argument
     *  minLength: 1, // Minimum length if this were a string argument
     *  maxLength: 10 // Maximum length if this were a string argument
     * });
     * 
     * @param {Object} arg
     * @param {String} arg.name - The name of the argument.
     * @param {String} [arg.description] - The description of the argument. Must be defined either here or in docs().
     * @param {String} [arg.type] - The datatype of the argument. Defaults to string.
     * @param {Boolean} [arg.optional] - Whether the argument is optional. Defaults to false; arguments are required by default.
     * @param {String} [arg.subcommand] - The optional name of the subcommand this argument belongs or should belong to, if any.
     * @param {String} [arg.subgroup] - The optional name of the subgroup this argument and its subcommand belong or should belong to, if any.
     * @param {Boolean} [arg.autoComplete] - Whether autocomplete is enabled for this argument. Cannot be used with choices.
     * @param {String[]|Number[]} [arg.choices] - An optional array of choices for users to choose from in this argument. Cannot be used with autoComplete.
     * @param {Number} [arg.max] - An optional maximum value for numeric arguments. Cannot be used with choices.
     * @param {Number} [arg.min] - An optional minimum value for numeric arguments. Cannot be used with choices.
     * @param {Number} [arg.maxLength] - An optional maximum length for string arguments. Cannot be used with choices.
     * @param {Number} [arg.minLength] - An optional minimum length for string arguments. Cannot be used with choices.
     * @returns 
     * @private
     */
    rawArgument({ name, description = "No description provided.", type = "string", optional = false, subcommand, subgroup, autoComplete, choices, max, min, maxLength, minLength }) {
        if (isDefined(name)) ErrorChecks.noexist(name, "Argument name was not provided");
        if (isDefined(name)) ErrorChecks.badtype(name, "string", "argument name");
        ErrorChecks.badtype(type, "string", "argument type");
        ErrorChecks.badtype(optional, "boolean", "argument optionality");
        ErrorChecks.exclusive(autoComplete, choices, "autoComplete", "choices");
        ErrorChecks.exclusive(min, choices, "min", "choices");
        ErrorChecks.exclusive(max, choices, "max", "choices");
        ErrorChecks.exclusive(maxLength, choices, "maxLength", "choices");
        ErrorChecks.exclusive(minLength, choices, "minLength", "choices");
        if (isDefined(subcommand)) ErrorChecks.badtype(subcommand, "string", "argument subcommand name");
        if (isDefined(subgroup)) ErrorChecks.badtype(subgroup, "string", "argument subgroup name");
        if (isDefined(subgroup)) ErrorChecks.noexist(subcommand, "Argument subcommand must be provided if a subgroup is provided");
        if (isDefined(autoComplete)) ErrorChecks.badtype(autoComplete, "boolean", "argument autoComplete parameter");
        if (isDefined(choices)) ErrorChecks.badtype(choices, "array", "argument choices");
        if (isDefined(max)) ErrorChecks.badtype(max, "number", "argument max value");
        if (isDefined(min)) ErrorChecks.badtype(min, "number", "argument min value");
        if (isDefined(maxLength)) ErrorChecks.badtype(maxLength, "number", "argument maxLength value");
        if (isDefined(minLength)) ErrorChecks.badtype(minLength, "number", "argument minLength value");
        if (isDefined(max) && isDefined(min)) ErrorChecks.pred(() => max < min, "Invalid argument max and min values; max must be larger than min");
        if (isDefined(maxLength) && isDefined(minLength)) ErrorChecks.pred(() => maxLength < minLength, "Invalid argument max and min values; maxLength must be larger than minLength");
        if (isDefined(choices)) ErrorChecks.minmax(choices.length, "number of choices", 1, 25);
        ErrorChecks.pred(() => choices && choices.some(c => c.toString().length < 1 || c.toString().length > 100), `At least one argument choice falls outside the required length range of 1-100 characters`);
        ErrorChecks.pred(() => choices && choices.some(c => !ArgTypes.choiceTypes().includes(ArgTypes.get(typeof c))), `Only argument choices of datatypes ${ArgTypes.choiceTypes().join(", ")} are supported`);
        if (isDefined(description)) ErrorChecks.minmax(description.length, "argument description length", 1, 100);
        if (isDefined(name)) ErrorChecks.minmax(name.length, "argument name length", 1, 32);
        if (isDefined(name)) ErrorChecks.slashname(name, "argument");

        // Check datatype

        const origType = type;
        type = ArgTypes.get(type);

        ErrorChecks.pred(() => type == ArgTypes.Unknown, `An invalid argument datatype, '${origType}', was unable to be interpreted`);
        ErrorChecks.pred(() => (isDefined(max) || isDefined(min)) && !ArgTypes.isNumeric(type), "Argument datatype must be numeric when using max or min");
        ErrorChecks.pred(() => (isDefined(maxLength) || isDefined(minLength)) && type != ArgTypes.String, "Argument datatype must be string when using maxLength or minLength");
        ErrorChecks.pred(() => isDefined(minLength) && !Number.isInteger(minLength), "Argument minLength value must be an integer");
        ErrorChecks.pred(() => isDefined(maxLength) && !Number.isInteger(maxLength), "Argument maxLength value must be an integer");
        ErrorChecks.pred(() => autoComplete && !ArgTypes.isNumeric(type) && type != ArgTypes.String, `The specified argument datatype, '${origType}', does not support autoComplete`);
        ErrorChecks.pred(() => choices && choices.length == 0, "If using argument choices, at least one choice must be provided");
        ErrorChecks.pred(() => choices && choices.some(c => typeof c != ArgTypes.asPrimitive(type)), `At least one argument choice is of invalid datatype. Choices of a '${origType}' argument should be of type '${ArgTypes.asPrimitive(type)}'`);

        // Initialize variables

        let builder = this.builder;
        const sub = ((subgroup ?? "") + " " + (subcommand ?? "")).trim();
        const autoName = (sub + " " + name).trim();

        // Handle subcommand and subgroup

        if (subcommand) {
            this.addRawSub(sub, undefined, SubTypes.typeOf(subgroup, subcommand));
            builder = this.data.subs.get(sub);

            if (!name) return this;
        }

        // Handle autocomplete

        if (autoComplete) this.data.autoComplete.set(autoName, null);

        // Add Argument

        let addArgument = builder.addStringOption.bind(builder);

        if (ArgTypes.isChannel(type)) addArgument = builder.addChannelOption.bind(builder);
        else if (type == ArgTypes.User) addArgument = builder.addUserOption.bind(builder);
        else if (type == ArgTypes.Bool) addArgument = builder.addBooleanOption.bind(builder);
        else if (type == ArgTypes.Role) addArgument = builder.addRoleOption.bind(builder);
        else if (type == ArgTypes.Mention) addArgument = builder.addMentionableOption.bind(builder);
        else if (type == ArgTypes.Float) addArgument = builder.addNumberOption.bind(builder);
        else if (type == ArgTypes.Int) addArgument = builder.addIntegerOption.bind(builder);
        else if (type == ArgTypes.File) addArgument = builder.addAttachmentOption.bind(builder);

        addArgument(arg => {
            arg.setName(name)
            .setDescription(description);

            arg.setRequired(!optional);
            if (isDefined(min)) arg.setMinValue(min);
            if (isDefined(max)) arg.setMaxValue(max);
            if (isDefined(maxLength)) arg.setMaxLength(maxLength);
            if (isDefined(minLength)) arg.setMinLength(minLength);

            if (ArgTypes.isChannel(type)) arg.addChannelTypes(...ArgTypes.Channels.getChannelTypes(type));

            if (choices) arg.addChoices(...choices.map(choice => ({ name: choice, value: choice })));
            if (autoComplete) arg.setAutocomplete(true);

            ErrorChecks.isdupe(autoName, this.data.subs, "argument name");
            this.data.subs.set(autoName, arg);
            return arg;
        });

        return this;
    }

    /**
     * Adds a required permission or role to the command.
     * Specify role names/IDs starting with "@" (e.g. "@Administrator"), and perm names without it (e.g. "Administrator").
     * @param {String} permOrRole - The permission name, role name, or role ID to add to the command.
     * @returns
     */
    require(permOrRole) {
        ErrorChecks.noexist(permOrRole, "Permission or role name/ID was not provided");
        ErrorChecks.badtype(permOrRole, "string", "permission or role name/ID");

        const perms = Object.keys(PermissionsBitField.Flags).map(key => key.toLowerCase());
        let value = permOrRole.replace("@", "");

        if (perms.includes(permOrRole.toLowerCase()) && !permOrRole.startsWith("@")) this.data.requires.perms.add(perms[value]);
        else this.data.requires.roles.add(value);

        return this;
    }

    /**
     * Adds multiple required permissions or roles to the command at once.
     * Specify role names/IDs starting with "@" (e.g. "@Mod"), and perm names without it (e.g. "Administrator").
     * @param {String[]} permsOrRoles - The permissions and/or role names/IDs to add to the command.
     * @returns
     */
    requires(permsOrRoles) {
        ErrorChecks.noexist(permsOrRoles, "Permissions or roles were not provided");
        ErrorChecks.badtype(permsOrRoles, "array", "permissions/roles argument");

        permsOrRoles.forEach(permOrRole => this.require(permOrRole));
        return this;
    }

    /**
     * Defines a channel that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String} channel - The ID or name of the channel.
     * @returns
     */
    channel(channel) {
        ErrorChecks.noexist(channel, "Channel name/ID was not provided");
        ErrorChecks.badtype(channel, "string", "channel name/ID");

        this.data.channels.add(channel.replace(/ /g, "-"));
        return this;
    }

    /**
     * Defines multiple channels that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String[]} channels - The IDs and/or names of the channels.
     * @returns
     */
    channels(channels) {
        ErrorChecks.noexist(channels, "Channels were not provided");
        ErrorChecks.badtype(channels, "array", "channels argument");

        channels.forEach(channel => this.channel(channel));
        return this;
    }

    /**
     * Defines a guild that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String} guild - The ID or name of the guild.
     * @returns
     */
    guild(guild) {
        ErrorChecks.noexist(guild, "Guild name/ID was not provided");
        ErrorChecks.badtype(guild, "string", "guild name/ID");

        this.data.guilds.add(guild);
        return this;
    }

    /**
     * Defines multiple guilds that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String[]} guilds - The IDs and/or names of the guilds.
     * @returns
     */
    guilds(guilds) {
        ErrorChecks.noexist(guilds, "Guilds were not provided");
        ErrorChecks.badtype(guilds, "array", "guilds argument");

        guilds.forEach(guild => this.guild(guild));
        return this;
    }

    /**
     * Sets whether use of this command in DMs is enabled when globally published.
     * @param {Boolean} [enabled] - Whether to enable DM use, true by default.
     * @returns 
     */
    dms(enabled = true) {
        ErrorChecks.badtype(enabled, "boolean", "dms argument");
        ErrorChecks.pred(() => this.data.guilds.size, "Cannot enable DM permission on guild command");

        this.builder.setDMPermission(enabled);
        return this;
    }

    /**
     * Makes this command NSFW-only.
     * NSFW-only commands can only be used in NSFW channels.
     * @returns 
     */
    nsfw() {
        this.builder.setNSFW(true);
        return this;
    }

    /**
     * Defines argument/subcommand descriptions, with support for localizations in various languages.
     * Used internally by docs().
     * 
     * This method, descriptions(), should only be called after arguments and subcommands are created.
     * @example
     * descriptions({
     *  // Basic argument description:
     *  "<argname>": "A description.",
     * 
     *  // Basic argument localized descriptions:
     *  "<somearg>": {
     *      "default": "A description.", // Default (optional if en-US or en-GB are provided)
     *      "en-US": "A colorful American description.", // English (US)
     *      "en-GB": "A colourful British description." // English (UK)
     *  },
     * 
     *  // Argument of a subgroup and subcommand:
     *  "subgroup subcmd <arg1>": "Description of arg1 for everyone.",
     * 
     *  // Localizations of another argument of the same subgroup and subcommand:
     *  "subgroup subcmd [arg2]": {,
     *      [Vidar.def]: "Default description.", // Default
     *      "en-US": "Description of arg2 in the USA.", // English (US)
     *      "fr": "La description de arg2 en France." // French
     *  }
     * });
     * 
     * @param {Object<string, import("discord-api-types/v10").LocalizationMap|string>} descriptions - A map of argument names to localized descriptions.
     * @returns
     * @deprecated Use docs() instead.
     */
    descriptions(descriptions) {
        if (this.#documented) return this;
        ErrorChecks.noexist(descriptions, "Argument/subcommand descriptions were not provided");

        for (const rawKey of Object.keys(descriptions)) {
            const key = rawKey.replace(/[^-_ \p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]/gu, "");

            ErrorChecks.hasnot(key, this.data.subs, `The argument/subcommand '${rawKey}' provided to descriptions() or document() is nonexistent`);
            const arg = this.data.subs.get(key);

            if (typeof descriptions[rawKey] == "string") arg.setDescription(descriptions[rawKey]);
            else {
                if ("default" in descriptions[rawKey]) {
                    arg.setDescription(descriptions[rawKey]["default"]);
                    delete descriptions[rawKey]["default"];
                }
                else if (require("./index").def in descriptions[rawKey]) {
                    arg.setDescription(descriptions[rawKey][require("./index").def]);
                    delete descriptions[rawKey][require("./index").def];
                }
                else if ("en-US" in descriptions[rawKey]) arg.setDescription(descriptions[rawKey]["en-US"]);
                else if ("en-GB" in descriptions[rawKey]) arg.setDescription(descriptions[rawKey]["en-GB"]);
                else ErrorChecks.noexist(null, "Every argument/subcommand must provide either a 'default' description or an 'en-US'/'en-GB' localized description");

                arg.setDescriptionLocalizations(descriptions[rawKey]);
            }
        }

        this.#documented = true;
        return this;
    }

    /**
     * Defines methods that handle autocompletion on specified arguments.
     * Specified arguments must be set as autocompletable in argument() or rawArgument().
     * 
     * This method, autocomplete(), should only be called after autocompletable arguments are created.
     * @example
     * autocomplete({
     *  // Basic arguments:
     *  "<*argname>": interaction => ["auto 1", "auto 2"],
     * 
     *  // Subcommand arguments:
     *  "subcommand <*argname>": interaction => ["apples", "oranges"],
     * 
     *  // Subgroup arguments:
     *  "subgroup subcommand <*argname>": interaction => ["plane", "helicopter"],
     * 
     *  // Intermediate method example (searching by first letter):
     *  "<*hero>": interaction => {
     *      const heroes = ["batman", "superman", "spiderman", "hulk", "vision", "flash"];
     *      const query = interaction.options.getFocused();
     * 
     *      // (Basic search that sorts heroes by closest to first letter of query)
     *      const f = (str) => Math.abs(query.charCodeAt(0) - str.charCodeAt(0));
     *      return heroes.sort((a, b) => f(a) - f(b));
     *  }
     * });
     * 
     * @param {Object<string, VidarAutoComplete>} methods - A map of argument names to autocomplete methods.
     */
    autocomplete(methods) {
        ErrorChecks.noexist(methods, "Autocomplete methods were not provided");

        for (const rawKey of Object.keys(methods)) {
            const key = rawKey.replace(/[^-_ \p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]/gu, "");

            ErrorChecks.hasnot(key, this.data.autoComplete, `The argument '${rawKey}' provided to autoComplete() is either nonexistent or not set as autocompletable`);
            this.data.autoComplete.set(key, methods[rawKey]);
        }

        return this;
    }

    /**
     * Defines a method or methods to execute when the command is executed.
     * Can either define a single method to handle all calls to this command, several methods that handle specific subcommands/subgroups, or both.
     * 
     * This method, action(), should be the last called of the command configuration methods, as the command is built by this method.
     * @example
     * // Basic, single-method:
     * action(interaction => {
     *  interaction.reply("Hello world!");
     * });
     * 
     * // Advanced, multi-method:
     * action({
     *  // Handle specific subcommands:
     *  "subcmd1": interaction => {
     *      interaction.reply("Hello from subcommand 1!");
     *  },
     *  "subcmd2": interaction => {
     *      interaction.reply("Hello from subcommand 2!");
     *  },
     * 
     *  // Handle specific subcommand within subgroup:
     *  "subgroup subcmd": interaction => {
     *      interaction.reply("Hello from the 'subcmd' subcommand of 'subgroup'!");
     *  },
     * 
     *  // Handle all other subcommands within subgroup:
     *  "subgroup": interaction => {
     *      interaction.reply("Hello from any subcommand in 'subgroup' other than 'subcmd'!");
     *      // (The method for "subgroup subcmd" takes precedence over that of "subgroup".
     *      // i.e. the "subgroup" method is not called when "/cmd subgroup subcmd" is run.)
     *  },
     * 
     *  // Handle all other uses of this command (default handler):
     *  [Vidar.def]: interaction => {
     *      interaction.reply("Hello from everything else.");
     *  }
     * });
     * 
     * @param {VidarAction|VidarActionMap} method - The method or methods to execute when the command is used.
    */
    action(method) {
        ErrorChecks.noexist(method, "Command action was not provided");

        if (typeof method === "function") this.data.action = method;
        else {
            const methods = /** @type {Map<String, VidarAction>} */ (new Map());
            const { def } = require("./index");

            for (const rawKey of Object.keys(method)) {
                const key = rawKey == def ? rawKey : rawKey.replace(/[^-_ \p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]/gu, "");

                if (key != def) ErrorChecks.hasnot(key, this.data.subs, `The subcommand or subgroup '${rawKey}' provided to action() is nonexistent`);
                methods.set(key, method[rawKey]);
            }

            this.data.action = interaction => {
                const subgroup = interaction.options.getSubcommandGroup(false) ?? "";
                const subcommand = interaction.options.getSubcommand(false) ?? "";

                const combo = (subgroup + " " + subcommand).trim();
                if (methods.has(combo)) methods.get(combo)(interaction); // High priority to specific subcommands in subgroups
                else if (methods.has(subgroup)) methods.get(subgroup)(interaction); // Lower priority to subgroups in general
                else if (methods.has(def)) methods.get(def)(interaction); // Lowest priority to default handler
            };
        }

        return this.build();
    }

    /**
     * @private
     */
    build() {
        // Handle documentation

        if (this.data.docs) this.descriptions(this.data.docs);
        // if (!this.#documented) console.warn("VidarWarn: Argument/subcommand descriptions were not provided. Please use document() or descriptions() to do so.");

        // Build command

        this.data.JSON = this.builder.toJSON();
        VidarHandler.setCommand(this.data.JSON.name, this);
    }
}

module.exports = VidarCommand;