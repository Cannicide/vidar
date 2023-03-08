// Represents a command that can easily be defined via command syntax (supports both text and slash commands)
// Partially inspired by the syntax of the `commander` npm module for cli
// Directly derived from the unfinished 4.0-dev rewrite of my older command handler package, node-elisif

const { SyntaxBuilder, SyntaxCache } = require("./syntax");
const { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandChannelOption } = require("discord.js");
const { ChannelType } = require("discord-api-types/v10");

class VidarCommand {

    constructor(name, description) {
        this.builder = new SyntaxBuilder(name, description);
    }

    build() {
        console.log("BUILDING");
        const factory = new SlashCommandBuilder();
        const built = this.builder.build();

        let args = built.arguments;
        factory.setName(built.command)
        .setDescription(built.description)
        .setDefaultPermission(true);

        const argumentHandler = (arg, origplant) => {
            let type;
            let plant = /** @type {SlashCommandBuilder} */ (origplant ?? factory);
            
            if (arg.type == "command") type = factory.addSubcommand.bind(factory);
            else if (arg.datatype.toLowerCase().endsWith("channel")) type = plant.addChannelOption.bind(plant);
            else if (arg.datatype.toLowerCase() == "user") type = plant.addUserOption.bind(plant);
            else if (["boolean", "bool"].includes(arg.datatype.toLowerCase())) type = plant.addBooleanOption.bind(plant);
            else if (arg.datatype == "role") type = plant.addRoleOption.bind(plant);
            else if (arg.datatype == "mention" || arg.datatype == "mentionable") type = plant.addMentionableOption.bind(plant);
            else if (["num", "number", "float"].includes(arg.datatype)) type = plant.addNumberOption.bind(plant);
            else if (["int", "integer", "intg"].includes(arg.datatype)) type = plant.addIntegerOption.bind(plant);
            else if (["attachment", "file", "image"].includes(arg.datatype)) type = plant.addAttachmentOption.bind(plant);
            else type = plant.addStringOption.bind(plant);

            type(argument => {
                argument.setName(arg.name)
                .setDescription(arg.description);

                if (arg.type != "command") argument.setRequired(!arg.optional);
                else {
                    arg.subarguments.forEach(item => argumentHandler(item, argument));
                    return argument;
                }

                if (argument instanceof SlashCommandIntegerOption || argument instanceof SlashCommandNumberOption) {
                    if (arg.min) argument.setMinValue(arg.min);
                    if (arg.max) argument.setMaxValue(arg.max);
                }
                else if (argument instanceof SlashCommandChannelOption) {
                    const type = arg.datatype.replace("channel", "").replace(/[^a-zA-Z]/g, "").toLowerCase().trim();
                    if (type.match("voice")) argument.addChannelTypes(ChannelType.GuildVoice);
                    if (type.match("category")) argument.addChannelTypes(ChannelType.GuildCategory);
                    if (type.match("news") || type.match("announcement")) argument.addChannelTypes(ChannelType.GuildAnnouncement);
                    if (type.match("stage")) argument.addChannelTypes(ChannelType.GuildStageVoice);
                    if (type.match("thread")) argument.addChannelTypes(ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread);
                    if (type.match("text")) argument.addChannelTypes(ChannelType.GuildText);
                }

                if (built.choices.has((origplant ? `${plant.name}:` : "") + arg.name)) argument.addChoices(...built.choices.get((origplant ? `${plant.name}:` : "") + arg.name).map(x => ({name:x, value:x})));
                if (built.autocomplete.has((origplant ? `${plant.name}:` : "") + arg.name)) argument.setAutocomplete(true);
                return argument;
            });

        };

        args.forEach(item => argumentHandler(item, null));

        built.json = factory.toJSON();
        SyntaxCache.set(built.command, built);
    }

    /**
     * Sets the description of the command being built.
     * @param {String} description - The description of the command.
     * @returns 
     */
     description(description) {
        this.builder.setDescription(description);
        return this;
    }

    /**
     * Adds a subcommand to this command.
     * Allows pre-defining a subcommand and setting its description.
     * Arguments that reference nonexistent subcommands will automatically create new subcommands using this method.
     * @param {String} name - The name of the subcommand to add to the command.
     * @param {String} description - The description of the subcommand.
     * @returns 
     */
    subcommand(name, description = undefined) {
        this.builder.addSubcommand(name, description);
        return this;
    }

    /**
     * Adds multiple subcommands to the command being built.
     * Subcommand descriptions and properties cannot be provided when using this method.
     * @param {String[]} subNames - The names of the subcommands to add to the command.
     * @returns 
     */
     subcommands(subNames) {
        subNames.forEach(subName => this.subcommand(subName));
        return this;
    }

    /**
     * Adds an argument to the command being built.
     * Special string syntax is used to determine the argument's subcommand, datatype, and whether it is an optional argument.
     * The various syntaxes are documented in the provided examples.
     * @example
     * // All options demonstrated in object literal form:
     * argument({
     *  name: "sub [name: float]", // subcommand with [optional argument of name 'name': and float datatype]
     *  description: "A description", // The description of the argument
     *  defaultValue: "A default value", // A default value to use if this optional argument is not used by the user
     *  choices: [1.46, 7], // Choices that the user must choose from
     *  autoComplete: (arg, interaction) => Number[], // Function to handle autocompleting this argument
     *  min: 1, // Minimum value of this float argument
     *  max: 10 // Maximum value of this float argument
     * });
     * 
     * // Autocomplete can also be used in parameter form, in place of the choices parameter.
     * // Autocomplete and choices are mutually exclusive, so both cannot be specified for the same argument.
     * // Min and max properties can only be used on number-based argument types
     * 
     * @param {Object} arg
     * @param {String} arg.name - The name of the argument.
     * @param {String} [arg.description] - The description of the argument.
     * @param {Function} [arg.autoComplete] - An optional auto complete callback for this argument. Cannot be used with choices.
     * @param {String[]} [arg.choices] - An optional array of choices for users to choose from in this argument. Cannot be used with autoComplete.
     * @param {*} [arg.defaultValue] - An optional default value to use if this argument is optional, and the user chooses not to enter a value.
     * @param {Number} [arg.max] - An optional maximum value for numeric arguments.
     * @param {Number} [arg.min] - An optional minimum value for numeric arguments.
     * @returns 
     */
    argument({name, description = undefined, autoComplete, choices, defaultValue = false, max, min}) {
        if (description !== null && description !== undefined && typeof description !== 'string') throw new Error("Error: An invalid datatype was used as an argument description.");

        this.builder.addArgument({ name, description, autoComplete, choices, defaultValue, max, min });
        return this;
    }

    /**
     * Adds multiple arguments to the command, subcommandgroup, or subcommand being built.
     * Argument descriptions and properties cannot be provided when using this method.
     * Argument types can be provided when using this method.
     * @param {Object[]} args - The names of the arguments to add to the command.
     * @returns 
     */
    arguments(args) {
        args.forEach(arg => this.argument(arg));
        return this;
    }

    /**
     * Adds a required permission or role to the command.
     * Role names that conflict with permissions (i.e. "ADMINISTRATOR") can be differentiated using "@" (e.g. "@Administrator").
     * @param {String} permission - The permission name, role name, or role ID to add to the command.
     * @returns
     */
    require(permission) {
        this.builder.addRequire(permission);
        return this;
    }

    /**
     * Adds multiple required permission or role to the command.
     * Role names that conflict with permissions (i.e. "ADMINISTRATOR") can be differentiated using "@" (e.g. "@Administrator").
     * @param {String[]} permissions - The permissions and/or role names/IDs to add to the command.
     * @returns
     */
    requires(permissions) {
        permissions.forEach(permission => this.builder.addRequire(permission));
        return this;
    }

    /**
     * Defines a channel that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String} channel - The ID or name of the channel.
     * @returns
     */
    channel(channel) {
        this.builder.addChannel(channel);
        return this;
    }

    /**
     * Defines multiple channels that the command can be used in.
     * Do not use this method if you want the command to be used in any channel.
     * @param {String[]} channels - The IDs and/or names of the channels.
     * @returns
     */
    channels(channels) {
        channels.forEach(channel => this.builder.addChannel(channel));
        return this;
    }

    /**
     * Defines a guild that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String} guild - The ID or name of the guild.
     * @returns
     */
    guild(guild) {
        this.builder.addGuild(guild);
        return this;
    }

    /**
     * Defines multiple guilds that the command can be used in.
     * Do not use this method if you want the command to be used in any guild.
     * @param {String[]} guilds - The IDs and/or names of the guilds.
     * @returns
     */
    guilds(guilds) {
        guilds.forEach(guild => this.builder.addGuild(guild));
        return this;
    }

    /**
     * Defines a method to execute when the command is executed.
     * 
     * This method, action(), should be the last called of the command configuration methods, as the command is built
     * by this method.
     * @param {(interaction: import('discord.js').ChatInputCommandInteraction) => void} method - The method to execute when the command is used.
    */
    action(method) {
        this.builder.setAction(method);
        return this.build();
    }

}

module.exports = VidarCommand;