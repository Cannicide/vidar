const { ChannelType } = require("discord-api-types/v10");

module.exports = class VidarArgTypes {

    static Channels = {
        All: "allchannel",
        Voice: "voicechannel",
        Stage: "stagechannel",
        Category: "categorychannel",
        Text: "textchannel",
        Announcement: "announcementchannel",
        Thread: "threadchannel",
        Forum: "forumchannel",
        getChannelTypes(value) {
            const key = VidarArgTypes.get(value);
            const types = {
                [this.Voice]: [ChannelType.GuildVoice],
                [this.Stage]: [ChannelType.GuildStageVoice],
                [this.Category]: [ChannelType.GuildCategory],
                [this.Text]: [ChannelType.GuildText],
                [this.Announcement]: [ChannelType.GuildAnnouncement],
                [this.Thread]: [ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread],
                [this.Forum]: [ChannelType.GuildForum]
            }
            types[this.All] = Object.values(types).flat();

            return types[key];
        }
    };
    static String = "string";
    static User = "user";
    static Bool = "boolean";
    static Role = "role";
    static Mention = "mention";
    static Float = "number";
    static Int = "integer";
    static File = "attachment";
    static Unknown = undefined;

    static get(value) {
        value = value.replace(/[^a-zA-Z]/g, "").toLowerCase().trim();
        if (value.endsWith("s")) value = value.slice(0, -1);

        if (value.endsWith("channel")) {
            switch (value.replace("channel", "")) {
                case "":
                case "all":
                    return this.Channels.All;
                case "voice":
                case "vc":
                    return this.Channels.Voice;
                case "stage":
                    return this.Channels.Stage;
                case "category":
                case "cat":
                    return this.Channels.Category;
                case "thread":
                    return this.Channels.Thread;
                case "announcement":
                case "announcements":
                    return this.Channels.Announcement;
                case "forum":
                case "forums":
                    return this.Channels.Forum;
                case "text":
                case "default":
                default:
                    return this.Channels.Text;
            }
        }
        else if (value == "user") return this.User;
        else if (["boolean", "bool"].includes(value)) return this.Bool;
        else if (value == "role") return this.Role;
        else if (["mention", "mentionable"].includes(value)) return this.Mention;
        else if (["num", "number", "float"].includes(value)) return this.Float;
        else if (["int", "integer", "intg"].includes(value)) return this.Int;
        else if (["attachment", "file", "image"].includes(value)) return this.File;
        else if (["string", "str"].includes(value)) return this.String;

        return this.Unknown;
    }

    static isNumeric(value) {
        const key = this.get(value);
        return key == this.Float || key == this.Int;
    }

    static asPrimitive(value) {
        switch (this.get(value)) {
            case this.User:
            case this.Role:
            case this.Mention:
            case this.File:
            case this.Channels.All:
                return "string";
            case this.Int:
                return "number";
            default:
                return this.get(value);
        }
    }

    static isChannel(value) {
        const key = this.get(value);
        return Object.keys(this.Channels).some(k => this.Channels[k] == key);
    }

}