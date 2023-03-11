const VidarSyntax = require("./syntax");
const {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    PermissionsBitField
} = require("discord.js");
const ArgTypes = require("./types");
const VidarHandler = require("./handler");
const ErrorChecks = require("./errors");

class VidarCommand {

    builder = new SlashCommandBuilder();

    /**
     * @private
     */
    data = {
        subcommands: /** @type {Map<string, import("discord.js").SlashCommandSubcommandBuilder>} */ (new Map()),
        subgroups: /** @type {Map<string, import("discord.js").SlashCommandSubcommandGroupBuilder>} */ (new Map()),
        autoComplete: new Map(),
        requires: {
            perms: new Set(),
            roles: new Set()
        },
        channels: new Set(),
        guilds: new Set(),
        action: () => {},
        JSON: null
    }

    constructor(name, description) {
        this.name(name);
        this.description(description);
    }

    /**
     * Sets the name of the command.
     * Used internally during construction.
     * @param {String} name - The name of the command.
     * @returns 
     * @private
     */
    name(name) {
        ErrorChecks.noexist(name, "Command name was not provided");
        ErrorChecks.badtype(name, "string", "command name");

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
    description(description) {
        ErrorChecks.noexist(description, "Command description was not provided");
        ErrorChecks.badtype(description, "string", "command description");

        this.builder.setDescription(description);
        return this;
    }

    /**
     * Adds a subcommand to this command.
     * Allows pre-defining a subcommand and setting its description.
     * Arguments that reference nonexistent subcommands will automatically create new subcommands using this method.
     * @param {Object} arg
     * @param {String} arg.name - The name of the subcommand to add to the command.
     * @param {String} arg.description - The required description of the subcommand.
     * @param {String} [arg.subgroup] - The optional subgroup this subcommand belongs to.
     * @returns 
     */
    subcommand({ name, description, subgroup }) {
        ErrorChecks.noexist(name, "Subcommand name was not provided");
        ErrorChecks.badtype(name, "string", "subcommand name");
        ErrorChecks.noexist(description, "The Discord API requires subcommand descriptions, and one was not provided");
        ErrorChecks.badtype(description, "string", "subcommand description");
        ErrorChecks.isdupe(name, this.data.subcommands, "subcommand");

        const sub = new SlashCommandSubcommandBuilder();
        sub.setName(name);
        sub.setDescription(description);
        this.data.subcommands.set(name, sub);

        if (subgroup) {
            if (!this.data.subgroups.has(subgroup)) this.subgroup({ name: subgroup, description: "No description provided." }); // this behavior is deprecated
            this.data.subgroups.get(subgroup).addSubcommand(sub);
        }
        else {
            this.builder.addSubcommand(sub);
        }

        return this;
    }

    /**
     * Adds multiple subcommands to the command.
     * @param {{name:string, description:string, subgroup:string}[]} subs - The data of the subcommands to add to the command.
     * @returns 
     */
     subcommands(subs) {
        ErrorChecks.noexist(subs, "Subcommands were not provided");
        ErrorChecks.badtype(subs, "array", "subcommands argument");

        subs.forEach(sub => this.subcommand(sub));
        return this;
    }

    /**
     * Adds a subgroup (i.e. subcommand group) to this command.
     * Allows pre-defining a subgroup and setting its description.
     * Arguments that reference nonexistent subgroups will automatically create new subgroups using this method.
     * @param {Object} arg
     * @param {String} arg.name - The name of the subgroup to add to the command.
     * @param {String} arg.description - The required description of the subgroup.
     * @returns 
     */
    subgroup({ name, description }) {
        ErrorChecks.noexist(name, "Subgroup description was not provided");
        ErrorChecks.badtype(name, "string", "subgroup name");
        ErrorChecks.noexist(description, "Subgroup description was not provided");
        ErrorChecks.badtype(description, "string", "subgroup description");
        ErrorChecks.isdupe(name, this.data.subgroups, "subgroup");

        const sub = new SlashCommandSubcommandGroupBuilder();
        sub.setName(name);
        sub.setDescription(description);

        this.data.subgroups.set(name, sub);
        this.builder.addSubcommandGroup(sub);
        return this;
    }

    /**
     * Adds multiple subgroups to the command.
     * @param {{name:string, description:string}[]} subs - The data of the subgroups to add to the command.
     * @returns 
     */
    subgroups(subs) {
        ErrorChecks.noexist(subs, "Subgroups were not provided");
        ErrorChecks.badtype(subs, "array", "subgroups argument");

        subs.forEach(sub => this.subgroup(sub));
        return this;
    }

    /**
     * @callback VidarAutoComplete
     * @param {import("discord.js").ChatInputCommandInteraction} interaction
     * @returns {*[]}
     * 
     * An argument to a Vidar command.
     * @typedef {Object} VidarArgument
     * @prop {String} syntax - The syntax of the argument.
     * @prop {String} description - The required description of the argument.
     * @prop {VidarAutoComplete} [autoComplete] - An optional auto complete callback for this argument. Cannot be used with choices.
     * @prop {String[]} [choices] - An optional array of choices for users to choose from in this argument. Cannot be used with autoComplete.
     * @prop {*} [defaultValue] - An optional default value to use if this argument is optional, and the user chooses not to enter a value.
     * @prop {Number} [max] - An optional maximum value for numeric arguments.
     * @prop {Number} [min] - An optional minimum value for numeric arguments.
     */

    /**
     * Adds an argument to the command.
     * Special syntax is used to determine the argument's name, subcommand, datatype, and whether it is an optional argument.
     * The special syntax is demonstrated in the provided example.
     * 
     * Note: Autocomplete and choices are mutually exclusive, so both cannot be specified for the same argument.
     * Note: Min and max properties can only be used on number-based argument types
     * @example
     * // All options demonstrated:
     * argument({
     *  syntax: "sub [name: float]", // Optional argument named 'name' with float datatype belonging to subcommand 'sub'
     *  description: "A description", // The description of the argument
     *  choices: [1.46, 7], // Choices that the user must choose from
     *  autoComplete: (interaction) => Number[], // Function to handle autocompleting this argument
     *  min: 1, // Minimum value of this float argument
     *  max: 10 // Maximum value of this float argument
     * });
     *
     * // Minimum options demonstrated:
     * argument({
     *  syntax: "<name>", // Required argument named 'name' with default string datatype
     *  description: "Some description" // The description of the argument
     * });
     * 
     * @param {VidarArgument} arg
     * @returns 
     */
    argument({ syntax, description, autoComplete, choices, max, min }) {
        ErrorChecks.noexist(syntax, "Argument name was not provided");
        ErrorChecks.badtype(syntax, "string", "argument name");
        ErrorChecks.noexist(description, "Argument description was not provided");
        ErrorChecks.badtype(description, "string", "argument description");

        // TODO: in future version, add maxLength and minLength string parameters to argument()

        const args = VidarSyntax.parseArgument(syntax);
        let arg = {
            name: undefined,
            description,
            autoComplete,
            choices,
            max,
            min,
            subgroup: undefined,
            subcommand: undefined,
            optional: undefined,
            type: undefined
        };

        arg.subgroup = args.find(a => a.subgroup)?.name;
        arg.subcommand = args.find(a => a.subcommand)?.name;
        
        let parsedArg = args.find(a => !a.sub);
        arg.name = parsedArg.name;
        arg.optional = parsedArg.optional;
        arg.type = parsedArg.type;

        return this.rawArgument(arg);
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
     * 
     * Note: Autocomplete and choices are mutually exclusive, so both cannot be specified for the same argument.
     * Note: Min and max properties can only be used on number-based argument types
     * @example
     * // All options demonstrated:
     * argument({
     *  name: "name", // Name of the argument
     *  description: "A description", // The description of the argument
     *  type: "float", // Datatype of the argument
     *  optional: true, // Whether the argument is optional or required
     *  subcommand: "sub", // The subcommand this argument belongs to
     *  subgroup: null, // The subgroup this argument and its subcommand belong to
     *  choices: [1.46, 7], // Choices that the user must choose from
     *  autoComplete: (interaction) => Number[], // Function to handle autocompleting this argument
     *  min: 1, // Minimum value of this float argument
     *  max: 10 // Maximum value of this float argument
     * });
     * 
     * @param {Object} arg
     * @param {String} arg.name - The name of the argument.
     * @param {String} arg.description - The required description of the argument.
     * @param {String} [arg.type] - The datatype of the argument. Defaults to string.
     * @param {Boolean} [arg.optional] - Whether the argument is optional. Defaults to false; arguments are required by default.
     * @param {String} [arg.subcommand] - The optional name of the subcommand this argument belongs or should belong to, if any.
     * @param {String} [arg.subgroup] - The optional name of the subgroup this argument and its subcommand belong or should belong to, if any.
     * @param {VidarAutoComplete} [arg.autoComplete] - An optional auto complete callback for this argument. Cannot be used with choices.
     * @param {String[]} [arg.choices] - An optional array of choices for users to choose from in this argument. Cannot be used with autoComplete.
     * @param {Number} [arg.max] - An optional maximum value for numeric arguments.
     * @param {Number} [arg.min] - An optional minimum value for numeric arguments.
     * @returns 
     */
    rawArgument({ name, description, type = "string", optional = false, subcommand, subgroup, autoComplete, choices, max, min }) {
        ErrorChecks.noexist(name, "Argument name was not provided");
        ErrorChecks.badtype(name, "string", "argument name");
        ErrorChecks.noexist(description, "Argument description was not provided");
        ErrorChecks.badtype(description, "string", "argument description");
        ErrorChecks.badtype(type, "string", "argument type");
        ErrorChecks.badtype(optional, "boolean", "argument optionality");
        ErrorChecks.exclusive(autoComplete, choices, "autoComplete", "choices");
        if (subcommand) ErrorChecks.badtype(subcommand, "string", "argument subcommand name");
        if (subgroup) ErrorChecks.badtype(subgroup, "string", "argument subgroup name");
        if (subgroup) ErrorChecks.noexist(subcommand, "Argument subcommand must be provided if a subgroup is provided");
        if (autoComplete) ErrorChecks.badtype(autoComplete, "function", "argument autoComplete callback");
        if (choices) ErrorChecks.badtype(choices, "array", "argument choices");
        if (max) ErrorChecks.badtype(max, "number", "argument max value");
        if (min) ErrorChecks.badtype(min, "number", "argument min value");

        // Check datatype

        const origType = type;
        type = ArgTypes.get(type);

        ErrorChecks.pred(() => type == ArgTypes.Unknown, `An invalid argument datatype, '${origType}', was unable to be interpreted`);
        ErrorChecks.pred(() => (max || min) && !ArgTypes.isNumeric(type), "Argument datatype must be numeric when using max or min");
        ErrorChecks.pred(() => autoComplete && true, `The specified argument datatype, '${origType}', does not support autoComplete`);
        ErrorChecks.pred(() => choices && choices.length == 0, "If using argument choices, at least one choice must be provided");
        ErrorChecks.pred(() => choices && choices.some(c => c != ArgTypes.asPrimitive(type)), `At least one argument choice is of invalid datatype. Choices of a '${origType}' argument should be of type '${ArgTypes.asPrimitive(type)}'`);

        let builder = this.builder;

        // Handle subcommand and subgroup

        if (subcommand) {
            if (!this.data.subcommands.has(subcommand)) this.subcommand({ name: subcommand, description: "No description provided.", subgroup }); // this behavior is deprecated
            builder = this.data.subcommands.get(subcommand);

            if (autoComplete && !this.data.autoComplete.has(subcommand)) this.data.autoComplete.set(subcommand, new Map());
        }

        // Handle autocomplete

        if (autoComplete) {
            if (!subcommand) this.data.autoComplete.set(name, autoComplete);
            else this.data.autoComplete.get(subcommand).set(name, autoComplete);
        }

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
            if (min) arg.setMinValue(min);
            if (max) arg.setMaxValue(max);

            if (ArgTypes.isChannel(type)) arg.addChannelTypes(...ArgTypes.Channels.getChannelTypes(type));

            if (choices) arg.addChoices(...choices.map(choice => ({ name: choice, value: choice })));
            if (autoComplete) arg.setAutocomplete(true);

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

        this.data.channels.add(channel);
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

        this.builder.setDMPermission(enabled);
        return this;
    }

    /**
     * Defines a method to execute when the command is executed.
     * 
     * This method, action(), should be the last called of the command configuration methods, as the command is this.data
     * by this method.
     * @param {(interaction: import('discord.js').ChatInputCommandInteraction) => void} method - The method to execute when the command is used.
    */
    action(method) {
        ErrorChecks.noexist(method, "Command action was not provided");
        ErrorChecks.badtype(method, "function", "command action");

        this.data.action = method;
        return this.build();
    }

    /**
     * @private
     */
    build() {
        this.data.JSON = this.builder.toJSON();
        VidarHandler.setCommand(this.data.JSON.name, this);
    }
}

module.exports = VidarCommand;