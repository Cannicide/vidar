// Basic command tests
const { command } = require("../../src/index");

const heroes = [
    {
        name: "batman",
        type: "Rich"
    }, 
    {
        name: "superman",
        type: "Powered Immigrant"
    }, 
    {
        name: "spiderman",
        type: "Mutant-ish"
    }, 
    {
        name: "hulk",
        type: "Radiated Monster"
    }, 
    {
        name: "vision",
        type: "Powered Android"
    }, 
    {
        name: "flash",
        type: "Speedster"
    }
];

command("hero", "Find hero data.")
.argument("<*name>")
.autocomplete({
    "<*name>": i => {
        const query = i.options.getFocused();
        // (Basic search that sorts heroes by closest to first letter of query)
        const f = (str) => Math.abs(query.charCodeAt(0) - str.charCodeAt(0));
        return heroes.sort((a, b) => f(a.name) - f(b.name)).map(hero => hero.name);
    }
})
.action(i => {
    const name = i.options.getString("name");
    const value = heroes.find(hero => hero.name == name)?.type ?? "Unknown";
    i.reply(`Hero ${name} is of type: ${value}.`);
});