const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const MESSAGE_TAG = "xq14g is a burger";
const withTag = content => content.includes(MESSAGE_TAG)
  ? content
  : `${content}\n\n${MESSAGE_TAG}`;

async function addEmojis(guild, raw, requester) {
  const matches = [...raw.matchAll(/<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>/g)];
  const unique = [...new Map(matches.map(match => [
    match[3],
    { animated: Boolean(match[1]), name: match[2], id: match[3] }
  ])).values()];

  if (!unique.length) {
    return "⚠️ I couldn't find any custom emoji mentions. Paste <:name:emoji_id> or <a:name:emoji_id>.";
  }

  const botMember = await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
    return "❌ I need Manage Emojis and Stickers permission.";
  }

  let added = 0;
  let failed = 0;
  const errors = [];

  for (const emoji of unique) {
    try {
      const extension = emoji.animated ? "gif" : "png";
      await guild.emojis.create({
        attachment: `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=128&quality=lossless`,
        name: emoji.name,
        reason: `Requested by ${requester} via emoji add command`
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

  return `✅ Added **${added}** emoji(s). ❌ Failed: **${failed}**.${errors.length ? "\n" + errors.join("\n") : ""}`;
}


async function toggleAnnouncementChannel(channel, requester) {
  if (!channel || channel.type !== ChannelType.GuildText) {
    return "❌ Please provide a normal text channel, e.g. `!announcement #news`.";
  }
  const me = await channel.guild.members.fetchMe();
  if (!me.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
    return "❌ I need Manage Channels permission in that channel.";
  }
  await channel.edit({
    type: ChannelType.GuildAnnouncement,
    reason: `Announcement channel enabled by ${requester}`
  });
  return `✅ ${channel} is now an Announcement channel. Members can follow it from other servers.`;
}

client.once("ready", () => {
  console.log(`Emoji bot online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.id === client.user?.id) {
    if (message.content.includes(MESSAGE_TAG)) return;
    const content = withTag(message.content || "");
    if (content.length <= 2000) {
      try { await message.edit({ content }); }
      catch (error) { console.error("Could not append bot message tag:", error.message); }
    }
    return;
  }

  if (message.author.bot || !message.guild || !message.content) return;
  const trimmed = message.content.trim();

  const announcementMatch = trimmed.match(/^!announcement\\s+(<#\\d{17,20}>|\\d{17,20})\\s*$/i);
  if (announcementMatch) {
    try {
      const channelId = announcementMatch[1].replace(/[<#>]/g, "");
      const channel = await message.guild.channels.fetch(channelId);
      const result = await toggleAnnouncementChannel(channel, message.author.tag);
      await message.reply({ content: withTag(result), allowedMentions: { parse: [] } });
    } catch (error) {
      console.error("Announcement channel command failed:", error);
      await message.reply({
        content: withTag(`❌ Could not change that channel: ${error.message || "unknown error"}`),
        allowedMentions: { parse: [] }
      }).catch(() => {});
    }
    return;
  }
  if (!trimmed.toLowerCase().startsWith("!emojisteal ") &&
      !trimmed.toLowerCase().startsWith("!steal ")) return;

  const raw = trimmed.replace(/^!(?:emojisteal|steal)\s+/i, "");
  try {
    const result = await addEmojis(message.guild, raw, message.author.tag);
    await message.reply({ content: withTag(result), allowedMentions: { parse: [] } });
  } catch (error) {
    console.error("Prefix emoji command failed:", error);
    await message.reply({
      content: withTag(`❌ ${error.message || "Something went wrong while adding emojis."}`),
      allowedMentions: { parse: [] }
    }).catch(() => {});
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "emojisteal") return;

  try {
    if (!interaction.guild) {
      return interaction.reply({
        content: withTag("Use this command inside a server."),
        allowedMentions: { parse: [] }
      });
    }

    const raw = interaction.options.getString("emojis") || "";
    await interaction.deferReply();
    const result = await addEmojis(interaction.guild, raw, interaction.user.tag);
    return interaction.editReply({ content: withTag(result), allowedMentions: { parse: [] } });
  } catch (error) {
    console.error("emojisteal failed:", error);
    const content = withTag(`❌ ${error.message || "Something went wrong while adding emojis."}`);
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content, allowedMentions: { parse: [] } }).catch(() => {});
    }
    return interaction.reply({ content, allowedMentions: { parse: [] } }).catch(() => {});
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
