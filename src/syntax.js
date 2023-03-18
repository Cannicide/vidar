const ErrorChecks = require("./errors");
const { ArgTypes } = require("./types");

class VidarSyntax {
    
    /**
     * @param {string} syntax 
     */
    static parseArgument(syntax) {
        // Disable eslint's error, because that escape IS necessary
        // eslint-disable-next-line no-useless-escape
        let comps = syntax.split(/(?<!([<][^>]*)|([\[][^\]]*))\s+(?!([^<]*[>])|([^\[]*[\]]))/g); // Matches all spaces outside outermost  <> or [] brackets, supports inner > and <
        // let comps = syntax.split(/(?<!([<][^<>]*)|([\[][^\[\]]*))\s+/g); // Matches all spaces outside <> or [] brackets

        // Construct argument objects from syntax:

        let response = comps.filter(arg => arg !== undefined).map((arg, index) => {
            let result = {};

            ErrorChecks.pred(() => {
                return (arg.at(-1) == ">" && arg[0] != "<") ||
                (arg.at(-1) == "]" && arg[0] != "[") ||
                (arg.at(-1) != "]" && arg[0] == "[") ||
                (arg.at(-1) != ">" && arg[0] == "<");
            }, `Invalid argument segmentation in syntax: '${arg}'`);

            switch(arg[0]) {
                case "<":
                    // Required arg

                    result = {
                        ...this.parseInnerArgument(arg),
                        optional: false
                    };

                    break;
                case "[":
                    // Optional arg

                    result = {
                        ...this.parseInnerArgument(arg),
                        optional: true
                    };

                    break;
                default:
                    // Subgroup or subcommand

                    ErrorChecks.pred(() => index > 1, "Subgroups and subcommands can only be used as the first two arguments of a command");
                
                    result = {
                        name: arg.trim(),
                        sub: true,
                        optional: false
                    }
            }

            return result;
        });

        // Error checking:

        ErrorChecks.pred(() => response.length < 1, "Invalid command argument syntax.\nFailed to parse the following argument syntax:\n\n\t" + syntax);
        ErrorChecks.pred(() => response.length >= 2 && !response[0].sub && response[1].sub, "Cannot define a subcommand after an argument.\nFailed to parse the following argument syntax:\n\n\t" + syntax);
        
        // Identify subgroup and subcommand:

        if (response.filter(arg => arg.sub).length == 2) {
            response[0].subgroup = true;
            response[1].subcommand = true;
        }
        else if (response[0].sub) {
            response[0].subcommand = true;
        }

        return response;
    }

    /**
     * @param {string} arg 
     * @returns 
     */
    static parseInnerArgument(arg) {
        let result = {
            name: null,
            type: ArgTypes.String,
            sub: false,
            choices: undefined,
            max: undefined,
            min: undefined,
            maxLength: undefined,
            minLength: undefined,
            autoComplete: false
        };

        let comps = arg.slice(1, -1).trim().split(":");
        result.name = comps[0].trim();

        if (result.name[0] == "*") {
            result.autoComplete = true;
            result.name = result.name.slice(1);
        }

        const data = comps[1]?.trim();
        if (data) {
            if (data.match(/\|/)) {
                // Choices specified

                result.choices = data.split(/\s*\|\s*/g); // Matches all pipe (|) characters and any connected whitespace characters
                ErrorChecks.pred(() => result.choices.length < 2, "At least two choices must be specified when using choices");

                if (result.choices.some(c => isNaN(c))) result.type = ArgTypes.String;
                else if (result.choices.every(c => Number.isInteger(Number(c)))) result.type = ArgTypes.Int;
                else result.type = ArgTypes.Number;
            }
            else if (data.match(/[<>]/)) {
                // Max or min or maxLength or minLength specified

                const isLength = data.match(/l/g);
                let minRegex, maxRegex;

                if (!isLength) {
                    minRegex = /x\s*>\s*(\d\.*\d*)|(\d\.*\d*)\s*<\s*x/g;
                    maxRegex = /x\s*<\s*(\d\.*\d*)|(\d\.*\d*)\s*>\s*x/g;
                }
                else {
                    minRegex = /l\s*>\s*(\d\.*\d*)|(\d\.*\d*)\s*<\s*l/g;
                    maxRegex = /l\s*<\s*(\d\.*\d*)|(\d\.*\d*)\s*>\s*l/g;
                }

                const min = Array.from(data.matchAll(minRegex), m => m[1] || m[2]);
                const max = Array.from(data.matchAll(maxRegex), m => m[1] || m[2]);
                ErrorChecks.pred(() => !min.length && !max.length, `Invalid inner argument syntax specified: '${arg}'`);

                if (!isLength) {
                    if (min.length) result.min = Math.max(...min.map(num => Number(num))); // Ex: x > 3 and x > 4 should cause min to be 4 (the max of the two)
                    if (max.length) result.max = Math.min(...max.map(num => Number(num))); // Ex: x < 3 and x < 4 should cause max to be 3 (the min of the two)

                    if (min.concat(max).every(c => !c.match(/\./))) result.type = ArgTypes.Int;
                    else result.type = ArgTypes.Float;
                }
                else {
                    if (min.length) result.minLength = Math.max(...min.map(num => Number(num))); // Ex: l > 3 and l > 4 should cause min to be 4 (the max of the two)
                    if (max.length) result.maxLength = Math.min(...max.map(num => Number(num))); // Ex: l < 3 and l < 4 should cause max to be 3 (the min of the two)

                    result.type = ArgTypes.String;
                }
            }
            else {
                // Datatype specified

                result.type = data;
            }
        }

        return result;
    }

}

module.exports = VidarSyntax;