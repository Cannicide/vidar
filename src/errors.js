module.exports = class VidarError {
    static noexist(variable, message) {
        if (!variable) throw new Error("VidarError: " + message + ".");
    }
    
    static badtype(variable, type, descriptor) {
        if ((type == "array" && !Array.isArray(variable)) || (type != "array" && typeof variable !== type)) {
            throw new Error("VidarError: Invalid " + descriptor + ". Must be of type: " + type);
        }
    }

    static isdupe(variable, collection, descriptor) {
        if (collection.has(variable)) throw new Error("VidarError: Cannot define duplicate " + descriptor + "s.");
    }

    static exclusive(var1, var2, desc1, desc2) {
        if (var1 && var2) throw new Error("VidarError: Properties " + desc1 + " and " + desc2 + " are mutually exclusive. Both cannot be defined at once.");
    }

    static pred(f, message) {
        if (f()) throw new Error("VidarError: " + message + ".");
    }

    // TODO: move ALL used error throws here
}