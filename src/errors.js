module.exports = class VidarError {

    /**
     * Throws an error when a required variable has a falsy value (undefined, null, false).
     * @param {*} variable - The variable to check
     * @param {String} message 
     */
    static noexist(variable, message) {
        if (!variable) throw new Error("VidarError: " + message + ".");
    }
    
    /**
     * Throws an error when a variable is of a wrong or unexpected type.
     * @param {*} variable - The variable to check
     * @param {String} type - The datatype, e.g. "string"
     * @param {String} descriptor - Describes the variable, e.g. "command name"
     */
    static badtype(variable, type, descriptor) {
        if ((type == "array" && !Array.isArray(variable)) || (type != "array" && typeof variable !== type)) {
            throw new Error("VidarError: Invalid " + descriptor + ". Must be of type: " + type);
        }
    }

    /**
     * Throws an error when a Collection already contains a key equal to the variable.
     * @param {*} variable - The variable to check
     * @param {import("discord.js").Collection} collection
     * @param {String} descriptor - Describes the variable, e.g. "command name"
     */
    static isdupe(variable, collection, descriptor) {
        if (collection.has(variable)) throw new Error("VidarError: Cannot define duplicate " + descriptor + "s.");
    }

    /**
     * Throws an error if two mutually exclusive variables are both defined and have a truthy value.
     * @param {*} var1 - The first variable to check
     * @param {*} var2 - The second variable to check
     * @param {String} desc1 - Describes the first variable, e.g. "choices"
     * @param {String} desc2 - Describes the second variable, e.g. "autocomplete"
     */
    static exclusive(var1, var2, desc1, desc2) {
        if (var1 && var2) throw new Error("VidarError: Properties '" + desc1 + "' and '" + desc2 + "' are mutually exclusive. Both cannot be defined at once.");
    }

    /**
     * Throws an error if the given predicate function returns true.
     * @param {()=>boolean} f - The predicate function
     * @param {String} message 
     */
    static pred(f, message) {
        if (f()) throw new Error("VidarError: " + message + ".");
    }

    /**
     * Throws an error if slash command name validation -- which are used by the names of commands and their arguments -- fails.
     * @param {String} name - The name of the slash command, subcommand, subgroup, or argument
     * @param {String} descriptor - Describes what the name belongs to, e.g. "command" or "argument"
     */
    static slashname(name, descriptor) {
        // Official regex provided by Discord API, modified to allow space character
        if (!name.match(/^[-_ \p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/gu)) throw new Error(`VidarError: Invalid ${descriptor} name '${name}'. These names can only contain '-', '_', and letters and numbers in any language.`);
        if (name.match(/[\p{Lu}]/gu)) throw new Error(`VidarError: Invalid ${descriptor} name '${name}'. These names must be fully lowercase, except for letters in certain languages that do not have lowercase variants.`);
    }

    /**
     * Throws an error if a value exceeds the provided minimum and maximum boundaries (both min and max are inclusive).
     * @param {Number} value - The value to check.
     * @param {*} descriptor - Describes the value, e.g. "name length"
     * @param {Number} min 
     * @param {Number} max 
     */
    static minmax(value, descriptor, min, max) {
        if (value < min) throw new Error(`VidarError: Value of property '${descriptor}' is below the minimum of ${min}.`);
        if (value > max) throw new Error(`VidarError: Value of property '${descriptor}' is above the maximum of ${max}.`);
    }

    /**
     * Throws an error when a Collection does not contain a key equal to the variable.
     * @param {*} variable - The variable to check
     * @param {import("discord.js").Collection} collection
     * @param {String} message
     */
    static hasnot(variable, collection, message) {
        if (!collection.has(variable)) throw new Error("VidarError: " + message + ".");
    }
}