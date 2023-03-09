class VidarSyntax {
    
    /**
     * @param {string} syntax 
     */
    static parseArgument(syntax) {
        // Disable eslint's error, because that escape IS necessary
        // eslint-disable-next-line no-useless-escape
        let comps = syntax.split(/(?<![<\[][^<>\[\]]*)\s+/g); // Matches all spaces outside <> or [] brackets

        // Construct argument objects from syntax:

        let response = comps.map((arg, index) => {
            let result = {};

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

                    if (index > 1) throw new Error("VidarError: Subgroups and subcommands can only be used as the first two arguments of a command.");
                    if (comps.length == 1 || (index == 1 && comps.length == 2)) throw new Error("VidarError: Subgroups and subcommands cannot be the sole arguments added by arguments().\nIf you meant to add arguments instead of subcommands, make sure to enclose your argument name in <> or [] brackets to indicate whether it is a required or optional argument.\n(e.g. use '[name]' instead of 'name').\nIf you meant to add solely a subcommand, use the subcommand() method instead.");

                    result = {
                        name: arg.trim(),
                        sub: true,
                        optional: false
                    }
            }

            return result;
        });

        // Error checking:

        if (response.length < 1) throw new Error("VidarError: Invalid command argument syntax.\nFailed to parse the following argument syntax:\n\n\t" + syntax);
        if (response.length >= 2 && !response[0].sub && response[1].sub) throw new Error("VidarError: Cannot define a subcommand after an argument.\nFailed to parse the following argument syntax:\n\n\t" + syntax);
        if (response.length - response.filter(arg => arg.sub).length != 1) throw new Error("VidarError: Only one argument, along with its subcommand and subgroup, can be defined in a single syntax string.\nFailed to parse the following argument syntax:\n\n\t" + syntax);

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

    static parseInnerArgument(arg) {
        let result = {
            name: null,
            datatype: "string",
            sub: false
        };

        // Disable eslint's error, because that escape IS necessary
        // eslint-disable-next-line no-useless-escape
        let comps = arg.replace(/[<\[>\]]/g, "").trim().split(":");
        result.name = comps[0].trim();
        result.datatype = comps[1]?.trim() ?? "string";

        return result;
    }

}

module.exports = VidarSyntax;