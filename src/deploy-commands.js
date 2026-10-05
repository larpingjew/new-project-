const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

const commands = [];
const mod = (name, description) => new SlashCommandBuilder().setName(name).setDescription(description).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

commands.push(
  new SlashCommandBuilder().setName("help").setDescription("Show moderation commands"),
  new SlashCommandBuilder().setName("modhelp").setDescription("Show the moderation command list"),
  new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show server information"),
  new SlashCommandBuilder().setName("userinfo").setDescription("Show basic information about a server member").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(false)),
  new SlashCommandBuilder().setName("avatar").setDescription("Show a member's avatar").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(false)),
  new SlashCommandBuilder().setName("roleinfo").setDescription("Show information about a role").addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)),
  new SlashCommandBuilder().setName("channelinfo").setDescription("Show information about a channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(false)),
  new SlashCommandBuilder().setName("botinfo").setDescription("Show bot information"),
  new SlashCommandBuilder().setName("status").setDescription("Change bot activity").addStringOption(o=>o.setName("text").setDescription("Activity text").setRequired(true)).addStringOption(o=>o.setName("status").setDescription("Presence").addChoices({name:"Online",value:"online"},{name:"Idle",value:"idle"},{name:"Do Not Disturb",value:"dnd"},{name:"Invisible",value:"invisible"})).addStringOption(o=>o.setName("type").setDescription("Activity type").addChoices({name:"Playing",value:"playing"},{name:"Listening",value:"listening"},{name:"Watching",value:"watching"},{name:"Competing",value:"competing"})),
  new SlashCommandBuilder().setName("bio").setDescription("Set bot bio").addStringOption(o=>o.setName("text").setDescription("Bio").setRequired(true))
);

const addUserReason = (name, description) => mod(name, description).addUserOption(o=>o.setName("user").setDescription("Target member").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason").setMaxLength(500));
commands.push(
  addUserReason("kick","Kick a member"),
  addUserReason("ban","Ban a member"),
  addUserReason("softban","Ban then unban to remove recent messages"),
  addUserReason("unban","Unban a user").addStringOption(o=>o.setName("user_id").setDescription("User ID to unban").setRequired(true)),
  addUserReason("timeout","Timeout a member").addIntegerOption(o=>o.setName("minutes").setDescription("Timeout duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320)),
  addUserReason("untimeout","Remove a member timeout"),
  addUserReason("warn","Warn a member"),
  addUserReason("warnings","View a member's warnings"),
  addUserReason("clearwarnings","Clear a member's warnings"),
  addUserReason("purgeuser","Delete recent messages from a member").addIntegerOption(o=>o.setName("amount").setDescription("Number of messages to scan").setMinValue(1).setMaxValue(100)),
  addUserReason("nickname","Change a member's nickname").addStringOption(o=>o.setName("nickname").setDescription("New nickname; blank clears it").setMaxLength(32))
);
commands.push(
  mod("purge","Bulk delete recent messages").addIntegerOption(o=>o.setName("amount").setDescription("1-100 messages").setRequired(true).setMinValue(1).setMaxValue(100)),
  mod("slowmode","Set channel slowmode").addIntegerOption(o=>o.setName("seconds").setDescription("0-21600 seconds").setRequired(true).setMinValue(0).setMaxValue(21600)),
  mod("lock","Lock the current channel"),
  mod("unlock","Unlock the current channel"),
  mod("lockdown","Lock all text channels in this server"),
  mod("unlockdown","Unlock channels locked by this bot"),
  mod("announce","Post an announcement").addStringOption(o=>o.setName("message").setDescription("Announcement text").setRequired(true).setMaxLength(1800)).addChannelOption(o=>o.setName("channel").setDescription("Target text channel").addChannelTypes(ChannelType.GuildText)),
  mod("say","Send a message as the bot").addStringOption(o=>o.setName("message").setDescription("Message").setRequired(true).setMaxLength(1800)),
  mod("embed","Send a simple embed").addStringOption(o=>o.setName("title").setDescription("Embed title").setRequired(true).setMaxLength(200)).addStringOption(o=>o.setName("description").setDescription("Embed text").setRequired(true).setMaxLength(3500)),
  mod("roleadd","Add a role to a member").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)),
  mod("roleremove","Remove a role from a member").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)),
  mod("nick","Set or clear a member nickname").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o=>o.setName("nickname").setDescription("Nickname; empty clears it").setMaxLength(32)),
  mod("voicekick","Disconnect a member from voice").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)),
  mod("move","Move a member to a voice channel").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)).addChannelOption(o=>o.setName("channel").setDescription("Voice channel").setRequired(true).addChannelTypes(ChannelType.GuildVoice,ChannelType.GuildStageVoice)),
  mod("topic","Set current channel topic").addStringOption(o=>o.setName("topic").setDescription("Topic").setRequired(true).setMaxLength(1024)),
  mod("clearreactions","Clear reactions from a message").addStringOption(o=>o.setName("message_id").setDescription("Message ID").setRequired(true)),
  mod("slowmodeoff","Disable channel slowmode"),
  mod("rolelist","List server roles"),
  mod("membercount","Show server member count"),
  mod("created","Show when a user account was created").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  mod("joined","Show when a member joined").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)),
  mod("permissions","Show your permissions in this server"),
  mod("modstats","Show basic moderation totals"),
  mod("case","Show a warning case").addIntegerOption(o=>o.setName("id").setDescription("Warning case ID").setRequired(true).setMinValue(1)),
  mod("cleanbot","Delete recent bot messages").addIntegerOption(o=>o.setName("amount").setDescription("1-100 messages to scan").setRequired(true).setMinValue(1).setMaxValue(100)),
  mod("purgeattachments","Delete recent messages with attachments").addIntegerOption(o=>o.setName("amount").setDescription("1-100 messages to scan").setRequired(true).setMinValue(1).setMaxValue(100)),
  mod("purgeembeds","Delete recent messages with embeds").addIntegerOption(o=>o.setName("amount").setDescription("1-100 messages to scan").setRequired(true).setMinValue(1).setMaxValue(100)),
  mod("unpinall","Unpin all messages in the current channel"),
  mod("pin","Pin a message by ID").addStringOption(o=>o.setName("message_id").setDescription("Message ID").setRequired(true)),
  mod("unpin","Unpin a message by ID").addStringOption(o=>o.setName("message_id").setDescription("Message ID").setRequired(true)),
  mod("audit","Show recent moderation audit entries").addIntegerOption(o=>o.setName("amount").setDescription("1-10 entries").setMinValue(1).setMaxValue(10)),
  mod("setnick","Set or clear a member nickname").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o=>o.setName("nickname").setDescription("New nickname; empty clears it").setMaxLength(32)),
  mod("rolecolorinfo","Show role colour").addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)),
  mod("textchannels","List text channels"),
  mod("voicechannels","List voice channels"),
  mod("emergencylock","Lock this channel immediately"),
  mod("emergencyunlock","Unlock this channel"),
  mod("slowmodecheck","Show this channel's slowmode"),
  mod("botcheck","Check whether a member is a bot").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  mod("whois","Show basic member details").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
);

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in Railway variables.");
  process.exit(1);
}
const rest = new REST({version:"10"}).setToken(token);
(async()=>{try{
  const route = guildId ? Routes.applicationGuildCommands(clientId,guildId) : Routes.applicationCommands(clientId);
  console.log(`Registering ${commands.length} slash commands...`);
  await rest.put(route,{body:commands.map(c=>c.toJSON())});
  console.log("Slash commands registered.");
}catch(error){console.error("Command registration failed:",error);process.exit(1);}})();
