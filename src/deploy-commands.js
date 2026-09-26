const {
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const commands = [

    new SlashCommandBuilder()
        .setName("emojipack")
        .setDescription("Manage EmojiPacks")

        .addSubcommand(sub =>
            sub
                .setName("upload")
                .setDescription("Create an EmojiPack with up to 50 emojis")

                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("The name of the EmojiPack")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("emojis")
                        .setDescription("Paste up to 50 custom Discord emojis")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("load")
                .setDescription("Load an EmojiPack into a server")

                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("EmojiPack name")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("server_id")
                        .setDescription("Server ID to load the pack into")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("view")
                .setDescription("View the emojis inside an EmojiPack")

                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("EmojiPack name")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("delete")
                .setDescription("Delete an EmojiPack")

                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("EmojiPack name")
                        .setRequired(true)
                )
        )

        .addSubcommandGroup(group =>
            group
                .setName("admin")
                .setDescription("Manage EmojiPack admins")

                .addSubcommand(sub =>
                    sub
                        .setName("add")
                        .setDescription("Add an EmojiPack admin")

                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("User to make an admin")
                                .setRequired(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName("remove")
                        .setDescription("Remove an EmojiPack admin")

                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("User to remove")
                                .setRequired(true)
                        )
                )
        ),

    new SlashCommandBuilder()
        .setName("emojipacks")
        .setDescription("View all available EmojiPacks"),

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View EmojiPack commands")

].map(command => command.toJSON());

const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {

        console.log("Registering EmojiPack slash commands...");

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("EmojiPack slash commands registered!");

    } catch (error) {

        console.error("Failed to register slash commands:");
        console.error(error);

        process.exit(1);
    }
})();
