const { REST, Routes, SlashCommandBuilder } = require("discord.js");

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
    )
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
    console.log("Registering the only global slash command: /emojisteal");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map(command => command.toJSON())
    });
    console.log("Only /emojisteal is registered.");
  } catch (error) {
    console.error("Command registration failed:", error);
    process.exit(1);
  }
})();
