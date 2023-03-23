# Vidar Slash Command Arguments
Arguments for Vidar slash commands via a simple syntax.\
See the [commands documentation](https://github.com/Cannicide/vidar/tree/main/docs/commands/commands.md) for information on how to add these arguments to a command.

## Basic Argument
Create a required argument with name "arg":
```js
.argument("<arg>")
```

Create an optional argument with name "color":
```js
.argument("[color]")
```

Create multiple arguments at once in a single syntax:
```js
.argument("<arg> [color]")
```

Note: optional arguments cannot come anywhere before required arguments. Optional arguments must always be the last arguments of the command or subcommand.

## Datatype
Arguments are string types by default, but this can also be manually specified:
```js
.argument("<arg: string>")
```

Or make the argument a different type:
```js
.argument("<arg: integer>")
```

Supported datatypes:
- String / str
- User
- Boolean / bool
- Role
- Mention / mentionable
- Float / number / num
- Integer / intg / int
- File / attachment / image

## Autocompletable
Create an autocompletable argument:
```js
.argument("<*arg>")
```

Once the argument has been made autocompletable, then you can attach an [autocomplete handler](https://github.com/Cannicide/vidar/tree/main/docs/commands/commands.md#autocompletion) to it.

## Choices
Create an argument with choices:
```js
.argument("<color: red | blue | green>")
```

Choices can only be used with string, integer, or float datatypes. When using choices, Vidar automatically infers the datatype as a string if text is present, as an integer if whole numbers with no decimals are present, or as a float if numbers with decimals are present. If you provide whole numbers with no decimals as choices but want the datatype to be float, you can force Vidar to infer the datatype as float by writing at least one number in the form `2.0` instead of `2`.

## Min/Max
Create a numeric argument with minimum and maximum values:
```js
.argument("<arg: 3 < x < 5>") // min is 3, max is 5
```

Or:
```js
.argument("<arg: 5 > x > 3>") // min is 3, max is 5
```

Or just a minimum or a maximum:
```js
.argument("<arg: x > 3>") // min is 3
```

Min/max values can only be of integer or float datatypes.\
The letter used next to the greater/less than signs must be `x` (lowercase X).

## Min/Max Length
Create a string argument with minimum and maximum lengths:
```js
.argument("<arg: 1 < l < 10>") // min length is 1, max length is 10
```

Or:
```js
.argument("<arg: 10 > l > 1>") // min length is 1, max length is 10
```

Or just a minimum or maximum:
```js
.argument("<arg: l < 10>") // max length is 10
```

Min/max lengths can only be of string datatype.\
The letter used next to the greater/less than signs must be `l` (lowercase L).

## Subcommands
Create a basic subcommand:
```js
.argument("subcmd")
```

Create a subcommand with arguments:
```js
.argument("subcmd <arg1> <arg2>")
```

While multiple arguments can be created in a single syntax, only one subcommand can be created in a single syntax use.\
Creating multiple subcommands will require multiple `.argument()` calls, or a single `.arguments()` call.

## Subgroups
Create a subcommand with a subgroup:
```js
.argument("subgroup subcmd")
```

And with arguments:
```js
.argument("subgroup subcmd <arg1> <arg2>")
```

Like subcommands, only one subgroup can be created in a single syntax use.\
Subgroups cannot be created on their own, they must always be attached to a subcommand.

## Descriptions
Argument descriptions, unlike all other customization options, are not built into the syntax.\
See the [`.docs()` section](https://github.com/Cannicide/vidar/tree/main/docs/commands/commands.md#documentation) of the commands documentation for more information.