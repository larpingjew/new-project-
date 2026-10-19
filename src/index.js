const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
  EmbedBuilder
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const MESSAGE_TAG = "xq14g is a burger";
const CONFIG_PATH = path.join(process.cwd(), "data", "tag-config.json");
let tagConfig = {};
try { tagConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch {}
function saveTagConfig() {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(tagConfig, null, 2));
}
function getGuildTagConfig(guildId) {
  if (!tagConfig[guildId]) tagConfig[guildId] = {};
  return tagConfig[guildId];
}
function makeTagEmbed(member) {
  const cfg = getGuildTagConfig(member.guild.id);
  const role = cfg.roleId ? member.guild.roles.cache.get(cfg.roleId) : null;
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setDescription(`<@!${member.id}> just equipped **${member.guild.name}**'s server tag and got ${role ? role.toString() : "@Supporter"}!\\n\\n**How to equip it**\\n**User Settings → Profiles → Server Tag** → pick this server.`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }));
}
async function sendTagEmbed(channel, member) {
  const cfg = getGuildTagConfig(member.guild.id);
  await channel.send({
    embeds: [makeTagEmbed(member)],
    allowedMentions: { parse: [], users: [member.id], roles: cfg.roleId ? [cfg.roleId] : [] }
  });
}
function isManager(member) {
  return member?.permissions?.has(PermissionFlagsBits.ManageGuild) || member?.permissions?.has(PermissionFlagsBits.Administrator);
}

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


async function toggleAnnouncementChannel(channel, requesterMember, requesterTag) {
  if (!channel || channel.type !== ChannelType.GuildText) {
    return "❌ Please provide a normal text channel, e.g. `!announcement #news`.";
  }
  if (!requesterMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return "❌ You need Manage Channels permission to do this.";
  }
  const me = await channel.guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return "❌ I need Manage Channels permission.";
  }

  // Discord does not allow changing an existing text channel's type.
  // Create a matching announcement channel instead, leaving the original untouched.
  const announcement = await channel.guild.channels.create({
    name: channel.name,
    type: ChannelType.GuildAnnouncement,
    topic: channel.topic ?? undefined,
    parent: channel.parentId ?? undefined,
    permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow.bitfield,
      deny: overwrite.deny.bitfield,
      type: overwrite.type
    })),
    rateLimitPerUser: channel.rateLimitPerUser,
    nsfw: channel.nsfw,
    reason: `Announcement channel requested by ${requesterTag}; source channel: ${channel.id}`
  });
  return `✅ Created announcement channel ${announcement}. Discord doesn't allow converting an existing text channel in place, so the original ${channel} was left unchanged.`;
}

client.once("ready", () => {
  console.log(`Emoji bot online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.id === client.user?.id) {
    if (message.content.includes(MESSAGE_TAG) || message.embeds.length) return;
    const content = withTag(message.content || "");
    if (content.length <= 2000) {
      try { await message.edit({ content }); }
      catch (error) { console.error("Could not append bot message tag:", error.message); }
    }
    return;
  }


  if (message.author.bot || !message.guild || !message.content) return;
  const trimmed = message.content.trim();

  const tagRoleMatch = trimmed.match(/^!tag\s+role\s+<@&(\d{17,20})>$/i);
  const tagChannelMatch = trimmed.match(/^!tag\s+channel\s+<#(\d{17,20})>$/i);
  const tagTestMatch = trimmed.match(/^!tagtest\s+(?:<@!?(\d{17,20})>|(\d{17,20}))$/i);
  if (tagRoleMatch || tagChannelMatch) {
    if (!isManager(message.member)) {
      await message.reply({ content: withTag("❌ You need Manage Server permission to configure tag embeds."), allowedMentions: { parse: [] } });
      return;
    }
    const cfg = getGuildTagConfig(message.guild.id);
    if (tagRoleMatch) {
      const role = message.guild.roles.cache.get(tagRoleMatch[1]);
      if (!role) return message.reply({ content: withTag("❌ I couldn't find that role."), allowedMentions: { parse: [] } });
      cfg.roleId = role.id;
    } else {
      const channel = message.guild.channels.cache.get(tagChannelMatch[1]);
      if (!channel || channel.type !== ChannelType.GuildText) return message.reply({ content: withTag("❌ Please mention a text channel."), allowedMentions: { parse: [] } });
      cfg.channelId = channel.id;
    }
    saveTagConfig();
    await message.reply({ content: withTag("✅ Tag embed settings saved."), allowedMentions: { parse: [] } });
    return;
  }
  if (tagTestMatch) {
    const member = await message.guild.members.fetch(tagTestMatch[1] || tagTestMatch[2]).catch(() => null);
    if (!member) return message.reply({ content: withTag("❌ I couldn't find that server member."), allowedMentions: { parse: [] } });
    const cfg = getGuildTagConfig(message.guild.id);
    const channel = cfg.channelId ? message.guild.channels.cache.get(cfg.channelId) : message.channel;
    if (!channel || !channel.isTextBased()) return message.reply({ content: withTag("❌ Set a tag channel first with !tag channel #channel."), allowedMentions: { parse: [] } });
    await sendTagEmbed(channel, member);
    return;
  }

  const announcementMatch = trimmed.match(/^!announcement\s+(<#\d{17,20}>|\d{17,20})\s*$/i);
  if (announcementMatch) {
    try {
      const channelId = announcementMatch[1].replace(/[<#>]/g, "");
      const channel = await message.guild.channels.fetch(channelId);
      const result = await toggleAnnouncementChannel(channel, message.member, message.author.tag);
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
  if (!interaction.isChatInputCommand()) return;


  if (interaction.commandName === "tag") {
    try {
      if (!interaction.guild) return interaction.reply({ content: "Use this command inside a server.", flags: MessageFlags.Ephemeral });
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "You need Manage Server permission.", flags: MessageFlags.Ephemeral });
      const cfg = getGuildTagConfig(interaction.guild.id);
      if (interaction.options.getSubcommand() === "role") cfg.roleId = interaction.options.getRole("role", true).id;
      else cfg.channelId = interaction.options.getChannel("channel", true).id;
      saveTagConfig();
      return interaction.reply({ content: "✅ Tag embed settings saved.", flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error("Tag config slash command failed:", error);
      return interaction.reply({ content: "❌ Couldn't save that setting.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }

  if (interaction.commandName === "tagtest") {
    try {
      if (!interaction.guild) return interaction.reply({ content: "Use this command inside a server.", flags: MessageFlags.Ephemeral });
      const member = await interaction.guild.members.fetch(interaction.options.getUser("user", true).id).catch(() => null);
      if (!member) return interaction.reply({ content: "That user isn't in this server.", flags: MessageFlags.Ephemeral });
      const cfg = getGuildTagConfig(interaction.guild.id);
      const channel = cfg.channelId ? interaction.guild.channels.cache.get(cfg.channelId) : null;
      if (!channel || !channel.isTextBased()) return interaction.reply({ content: "Set a channel first with /tag channel.", flags: MessageFlags.Ephemeral });
      await sendTagEmbed(channel, member);
      return interaction.reply({ content: "✅ Test embed sent.", flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error("Tag test failed:", error);
      return interaction.reply({ content: "❌ Couldn't send the test embed.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }

  if (interaction.commandName === "announcement") {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: withTag("Use this command inside a server."), allowedMentions: { parse: [] } });
      }
      const channel = interaction.options.getChannel("channel", true);
      await interaction.deferReply();
      const result = await toggleAnnouncementChannel(channel, interaction.member, interaction.user.tag);
      return interaction.editReply({ content: withTag(result), allowedMentions: { parse: [] } });
    } catch (error) {
      console.error("Announcement slash command failed:", error);
      const content = withTag(`❌ Could not create announcement channel: ${error.message || "unknown error"}`);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ content, allowedMentions: { parse: [] } }).catch(() => {});
      return interaction.reply({ content, allowedMentions: { parse: [] } }).catch(() => {});
    }
  }

  if (interaction.commandName !== "emojisteal") return;

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


client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const oldPrimary = oldMember.user.primaryGuild || oldMember.user.primary_guild;
    const newPrimary = newMember.user.primaryGuild || newMember.user.primary_guild;
    const nowEquipped = newPrimary && newPrimary.identity_guild_id === newMember.guild.id && newPrimary.identity_enabled === true;
    const wasEquipped = oldPrimary && oldPrimary.identity_guild_id === oldMember.guild.id && oldPrimary.identity_enabled === true;
    if (!nowEquipped || wasEquipped) return;
    const cfg = getGuildTagConfig(newMember.guild.id);
    const channel = cfg.channelId ? newMember.guild.channels.cache.get(cfg.channelId) : null;
    if (!cfg.roleId || !channel || !channel.isTextBased()) return;
    await sendTagEmbed(channel, newMember);
  } catch (error) {
    console.error("Server tag equip event failed:", error);
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
