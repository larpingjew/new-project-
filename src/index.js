const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const MESSAGE_TAG = "xq14g is a burger";
const withTag = content => content.includes(MESSAGE_TAG)
  ? content
  : `${content}\n\n${MESSAGE_TAG}`;

client.once("ready", () => {
  console.log(`Emoji bot online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.id !== client.user?.id) return;
  if (message.content.includes(MESSAGE_TAG)) return;

  const content = withTag(message.content || "");
  if (content.length > 2000) return;

  try {
    await message.edit({ content });
  } catch (error) {
    console.error("Could not append bot message tag:", error.message);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "emojisteal") return;

  const send = content => interaction.reply({
    content: withTag(content),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] }
  });

  try {
    if (!interaction.guild) {
      return send("Use this command inside a server.");
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return send("You need Manage Emojis and Stickers permission.");
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return send("I need Manage Emojis and Stickers permission.");
    }

    const raw = interaction.options.getString("emojis") || "";
    const matches = [...raw.matchAll(/<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>/g)];
    const unique = [...new Map(matches.map(match => [
      match[3],
      { animated: Boolean(match[1]), name: match[2], id: match[3] }
    ])).values()];

    if (!unique.length) {
      return send("I couldn't find any custom emoji mentions. Paste <:name:emoji_id> or <a:name:emoji_id>.");
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let added = 0;
    let failed = 0;
    const errors = [];

    for (const emoji of unique) {
      try {
        const extension = emoji.animated ? "gif" : "png";
        await interaction.guild.emojis.create({
          attachment: `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=128&quality=lossless`,
          name: emoji.name,
          reason: `Requested by ${interaction.user.tag} via /emojisteal`
        });
        added++;
      } catch (error) {
        failed++;
        if (errors.length < 5) {
          const detail = error.code === 30008
            ? "server emoji limit reached"
            : error.code === 50013
              ? "missing permission"
              : error.message || "could not add";
          errors.push(`${emoji.name}: ${detail}`);
        }
      }
    }

    const result = `✅ Added **${added}** emoji(s). ❌ Failed: **${failed}**.${errors.length ? "\n" + errors.join("\n") : ""}`;
    return interaction.editReply({ content: withTag(result), allowedMentions: { parse: [] } });
  } catch (error) {
    console.error("emojisteal failed:", error);
    const content = withTag(`❌ ${error.message || "Something went wrong while adding emojis."}`);
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }).catch(() => {});
    }
    return interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }).catch(() => {});
  }
});

client.on("error", error => console.error("Discord client error:", error));
client.on("shardError", error => console.error("Discord gateway error:", error));

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is missing from Railway Variables.");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log("Discord login request accepted; waiting for READY event..."))
  .catch(error => {
    console.error("Discord login failed:", error);
    process.exit(1);
  });
