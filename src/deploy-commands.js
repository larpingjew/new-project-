const {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const commands = [

    new SlashCommandBuilder()
        .setName("emojipack")
        .setDescription("Manage EmojiPacks")
        .addSubcommand(sub =>
            sub
                .setName("upload")
                .setDescription("Create a new EmojiPack")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("The name of the EmojiPack")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("emoji1")
                        .setDescription("First custom Discord emoji")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("emoji2").setDescription("Second emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji3").setDescription("Third emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji4").setDescription("Fourth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji5").setDescription("Fifth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji6").setDescription("Sixth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji7").setDescription("Seventh emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji8").setDescription("Eighth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji9").setDescription("Ninth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji10").setDescription("Tenth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji11").setDescription("Eleventh emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji12").setDescription("Twelfth emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji13").setDescription("13th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji14").setDescription("14th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji15").setDescription("15th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji16").setDescription("16th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji17").setDescription("17th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji18").setDescription("18th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji19").setDescription("19th emoji")
                )
                .addStringOption(option =>
                    option.setName("emoji20").setDescription("20th emoji")
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
                        .setDescription("The server ID to load the pack into")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("view")
                .setDescription("View an EmojiPack")
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

        .addSubcommand(sub =>
            sub
                .setName("admin")
                .setDescription("Manage EmojiPack admins")
                .addSubcommand(admin =>
                    admin
                        .setName("add")
                        .setDescription("Add an EmojiPack admin")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("User to make an admin")
                                .setRequired(true)
                        )
                )
                .addSubcommand(admin =>
                    admin
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
        .setDescription("View all EmojiPack commands")

].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );

        console.log("Slash commands registered successfully.");
    } catch (error) {
        console.error(error);
    }
})();
