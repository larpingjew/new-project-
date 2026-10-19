const { REST, Routes, SlashCommandBuilder, ChannelType } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("emojisteal")
    .setDescription("Add custom emojis from emoji mentions to this server")
    .addStringOption(option =>
      option
        .setName("emojis")
        .setDescription("Paste one or more custom emoji mentions, e.g. <:name:123456789012345678>")
        .setRequired(true)
        .setMaxLength(4000)
    ),
  new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Configure server-tag announcement embeds")
    .addSubcommand(sub => sub
      .setName("role")
      .setDescription("Set the role mentioned in server-tag embeds")
      .addRoleOption(option => option.setName("role").setDescription("Role to mention").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("channel")
      .setDescription("Set the channel for server-tag embeds")
      .addChannelOption(option => option.setName("channel").setDescription("Text channel for embeds").setRequired(true).addChannelTypes(ChannelType.GuildText))),
  new SlashCommandBuilder()
    .setName("tagtest")
    .setDescription("Send a test server-tag embed for a member")
    .addUserOption(option => option.setName("user").setDescription("Member to preview").setRequired(true)),
  new SlashCommandBuilder()
    .setName("announcement")
    .setDescription("Create an announcement channel based on an existing text channel")
    .addChannelOption(option => option.setName("channel").setDescription("Text channel to copy").setRequired(true).addChannelTypes(ChannelType.GuildText))
];

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in Railway variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Registering global slash commands");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map(command => command.toJSON())
    });
    console.log("Global slash commands registered.");
  } catch (error) {
    console.error("Command registration failed:", error);
    process.exit(1);
  }
})();
