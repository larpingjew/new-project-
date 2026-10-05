const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("./database");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });
const OWNER_ID = process.env.OWNER_ID;
const setting = key => db.prepare("SELECT value FROM bot_settings WHERE key=?").get(key)?.value ?? "";
const setSetting = (key,value) => db.prepare("INSERT INTO bot_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,String(value));
const reasonFor = i => (i.options.getString("reason") || "No reason provided").slice(0,500);
const memberFor = async (i, name="user") => i.guild.members.fetch(i.options.getUser(name).id);
const reply = (i, content, ephemeral=true) => i.reply({content,ephemeral,allowedMentions:{parse:[]}});
const isOwner = i => i.user.id === OWNER_ID;
const getPrefix = guild => db.prepare("SELECT prefix FROM guild_settings WHERE guild_id=?").get(guild.id)?.prefix || "!";
const setPrefix = (guild, prefix) => db.prepare("INSERT INTO guild_settings(guild_id,prefix) VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET prefix=excluded.prefix").run(guild.id,prefix);
const commandPages = prefix => [
  ["Moderation", [[prefix+"kick <user> [reason]","Kick a member"],[prefix+"ban <user> [reason]","Ban a member"],[prefix+"softban <user> [reason]","Softban a member"],[prefix+"unban <user_id>","Unban a user"],[prefix+"timeout <user> <minutes>","Timeout a member"],[prefix+"untimeout <user>","Remove a timeout"],[prefix+"warn <user> [reason]","Warn a member"],[prefix+"warnings <user>","View warnings"],[prefix+"clearwarnings <user>","Clear warnings"]]],
  ["Messages & Channels", [[prefix+"purge <amount>","Delete recent messages"],[prefix+"purgeuser <user> <amount>","Delete a user messages"],[prefix+"cleanbot <amount>","Delete bot messages"],[prefix+"purgeattachments <amount>","Delete messages with attachments"],[prefix+"purgeembeds <amount>","Delete messages with embeds"],[prefix+"slowmode <seconds>","Set slowmode"],[prefix+"lock","Lock current channel"],[prefix+"unlock","Unlock current channel"],[prefix+"pin <message_id>","Pin a message"],[prefix+"unpin <message_id>","Unpin a message"],[prefix+"unpinall","Unpin all messages"]]],
  ["Members & Roles", [[prefix+"userinfo [user]","Show member information"],[prefix+"avatar [user]","Show an avatar"],[prefix+"roleinfo <role>","Show role information"],[prefix+"roleadd <user> <role>","Add a role"],[prefix+"roleremove <user> <role>","Remove a role"],[prefix+"nick <user> <name>","Set a nickname"],[prefix+"voicekick <user>","Disconnect from voice"],[prefix+"move <user> <channel>","Move a member"]]],
  ["Server & Utility", [[prefix+"serverinfo","Show server information"],[prefix+"membercount","Show member count"],[prefix+"rolelist","List roles"],[prefix+"textchannels","List text channels"],[prefix+"voicechannels","List voice channels"],[prefix+"created <user>","Show account creation time"],[prefix+"joined <user>","Show server join time"],[prefix+"permissions","Show permissions"],[prefix+"audit","Show audit log"],[prefix+"modstats","Show moderation totals"]]],
  ["Channels", [[prefix+"lockdown","Lock text channels"],[prefix+"unlockdown","Unlock text channels"],[prefix+"emergencylock","Lock current channel"],[prefix+"emergencyunlock","Unlock current channel"],[prefix+"slowmodeoff","Disable slowmode"],[prefix+"slowmodecheck","Check slowmode"],[prefix+"topic <topic>","Set channel topic"],[prefix+"clearreactions <message_id>","Clear reactions"]]],
  ["Bot & Help", [[prefix+"commands [page]","Open command guide"],[prefix+"help","Open command guide"],["/status","Change bot activity (owner)"],["/bio","Change bot bio (owner)"],["/prefix <new>","Change this server prefix"]]]
];
const commandEmbed = (guild,page=1) => { const pages=commandPages(getPrefix(guild)); const p=Math.max(1,Math.min(pages.length,page)); const data=pages[p-1]; return new EmbedBuilder().setTitle("🛡️ Commands • Page "+p+"/"+pages.length+" • "+data[0]).setDescription(data[1].map(x=>"**"+x[0]+"** — "+x[1]).join("\n")).setFooter({text:"Use "+getPrefix(guild)+"commands <page> for another page."}); };
function presence() {
  if (!client.user) return;
  const types = {playing:ActivityType.Playing,listening:ActivityType.Listening,watching:ActivityType.Watching,competing:ActivityType.Competing};
  client.user.setPresence({status:setting("status_state")||"online",activities:setting("status_text")?[{name:setting("status_text"),type:types[setting("status_type")]??ActivityType.Playing}]:[]});
}
client.once("ready",()=>{console.log(`Moderation bot online as ${client.user.tag}`);presence();});
client.on("error",e=>console.error("Discord client error:",e));
client.on("shardError",e=>console.error("Discord gateway error:",e));
client.on("warn",m=>console.warn("Discord.js warning:",m));
console.log("Starting Discord bot...");
if(!process.env.DISCORD_BOT_TOKEN){console.error("DISCORD_BOT_TOKEN is missing from Railway Variables.");process.exit(1);}

client.on("interactionCreate",async i=>{
  if(!i.isChatInputCommand()) return;
  try {
    const n=i.commandName, sub=i.options.getSubcommand(false);
    if(n==="commands"){const page=i.options.getInteger("page")||1;return i.reply({embeds:[commandEmbed(i.guild,page)],ephemeral:true});}
    if(n==="prefix"){if(!i.guild)return reply(i,"Use this command inside a server.");if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return reply(i,"You need Manage Server to change the prefix.");const p=i.options.getString("prefix");if(/\s/.test(p))return reply(i,"Prefix cannot contain spaces.");setPrefix(i.guild,p);return reply(i,"✅ Prefix changed to `"+p+"`. Use `"+p+"commands`.");}
    if(["help","modhelp"].includes(n)){
      const groups=[
        ["Moderation","/kick /ban /softban /unban /timeout /untimeout /warn /warnings /clearwarnings /case"],
        ["Messages & channels","/purge /purgeuser /cleanbot /purgeattachments /purgeembeds /slowmode /slowmodeoff /slowmodecheck /lock /unlock /lockdown /unlockdown /emergencylock /emergencyunlock /pin /unpin /unpinall /clearreactions /topic"],
        ["Members & roles","/userinfo /whois /avatar /created /joined /roleadd /roleremove /roleinfo /rolelist /rolecolorinfo /nickname /nick /setnick /voicekick /move /permissions"],
        ["Server tools","/serverinfo /channelinfo /membercount /textchannels /voicechannels /announce /say /embed /audit /modstats /botcheck"],
        ["Bot","/ping /botinfo /status /bio"]
      ];
      return i.reply({embeds:[new EmbedBuilder().setTitle("🛡️ Moderation Bot").setDescription(groups.map(([t,v])=>`**${t}**\n${v}`).join("\n\n")).setFooter({text:"Commands require the appropriate Discord permissions."})],ephemeral:true});
    }
    if(n==="ping") return reply(i,`🏓 Pong! ${client.ws.ping}ms`,false);
    if(n==="status"){
      if(!isOwner(i)) return reply(i,"Only the bot owner can change bot status.");
      const text=i.options.getString("text").slice(0,128), status=i.options.getString("status")||setting("status_state")||"online", type=i.options.getString("type")||setting("status_type")||"playing";
      setSetting("status_text",text);setSetting("status_state",status);setSetting("status_type",type);presence();return reply(i,"✅ Bot status updated.");
    }
    if(n==="bio"){
      if(!isOwner(i)) return reply(i,"Only the bot owner can change the bot bio.");
      const text=i.options.getString("text").slice(0,500);setSetting("bio",text);return reply(i,"✅ Bot bio updated.");
    }
    if(n==="botinfo") return i.reply({embeds:[new EmbedBuilder().setTitle(client.user.username).setDescription(setting("bio")||"Moderation bot").addFields({name:"Servers",value:String(client.guilds.cache.size),inline:true},{name:"Ping",value:`${client.ws.ping}ms`,inline:true})],ephemeral:true});
    if(!i.guild) return reply(i,"Use this command inside a server.");
    const g=i.guild, me=await g.members.fetchMe();
    const need=(permission)=>{if(!i.memberPermissions?.has(permission)) throw new Error(`You need ${permission.toLowerCase().replace(/([A-Z])/g," $1")} permission.`);};
    const botNeed=(permission)=>{if(!me.permissions.has(permission)) throw new Error(`I need ${permission.toLowerCase().replace(/([A-Z])/g," $1")} permission.`);};
    const targetOpt=i.options.getUser("user",false);
    const target=targetOpt?await g.members.fetch(targetOpt.id).catch(()=>null):null;
    const safeTarget=()=>{if(!target) throw new Error("That user is not a member of this server.");if(target.id===i.user.id) throw new Error("You cannot target yourself.");if(target.id===client.user.id) throw new Error("You cannot target the bot.");if(g.ownerId===target.id) throw new Error("You cannot moderate the server owner.");return target;};
    const reason=reasonFor(i);
    const warn=(userId,why)=>db.prepare("INSERT INTO warnings(guild_id,user_id,moderator_id,reason,created_at) VALUES(?,?,?,?,?)").run(g.id,userId,i.user.id,why,Date.now());
    const fetchChannel=()=>i.options.getChannel("channel",false)||i.channel;
    if(n==="serverinfo") return i.reply({embeds:[new EmbedBuilder().setTitle(g.name).setThumbnail(g.iconURL()).addFields({name:"Server ID",value:g.id,inline:true},{name:"Members",value:String(g.memberCount),inline:true},{name:"Created",value:`<t:${Math.floor(g.createdTimestamp/1000)}:D>`,inline:true})],ephemeral:true});
    if(["userinfo","whois","created","joined","avatar","botcheck"].includes(n)){
      const user=i.options.getUser("user",false)||i.user, m=await g.members.fetch(user.id).catch(()=>null);
      if(n==="avatar") return i.reply({content:user.displayAvatarURL({size:1024}),ephemeral:true});
      if(n==="created") return reply(i,`**${user.tag}** account created <t:${Math.floor(user.createdTimestamp/1000)}:F>.`);
      if(n==="joined") return reply(i,m?`**${user.tag}** joined <t:${Math.floor(m.joinedTimestamp/1000)}:F>.`:"That user is not in this server.");
      if(n==="botcheck") return reply(i,user.bot?`${user.tag} is a bot account.`:`${user.tag} is not a bot account.`);
      return i.reply({embeds:[new EmbedBuilder().setTitle(user.tag).setThumbnail(user.displayAvatarURL({size:512})).addFields({name:"User ID",value:user.id,inline:true},{name:"Bot account",value:String(user.bot),inline:true},{name:"Account created",value:`<t:${Math.floor(user.createdTimestamp/1000)}:F>`},{name:"Server nickname",value:m?.nickname||"None",inline:true},{name:"Joined server",value:m?.joinedTimestamp?`<t:${Math.floor(m.joinedTimestamp/1000)}:F>`:"Not a member",inline:true},{name:"Roles",value:m?m.roles.cache.filter(r=>r.id!==g.id).map(r=>r.toString()).slice(0,15).join(" ")||"None":"Not a member"} )],ephemeral:true});
    }
    if(n==="membercount") return reply(i,`👥 This server has **${g.memberCount}** members.`);
    if(n==="permissions") return reply(i,`Your server permissions: ${i.memberPermissions.toArray().join(", ")||"None"}`);
    if(n==="roleinfo"||n==="rolecolorinfo"){const r=i.options.getRole("role");return reply(i,`**${r.name}** • ID: ${r.id} • Colour: ${r.hexColor} • Members: ${r.members.size} • Position: ${r.position}`);}
    if(n==="rolelist") return reply(i,g.roles.cache.sort((a,b)=>b.position-a.position).map(r=>r.name).slice(0,80).join(", "));
    if(n==="textchannels"||n==="voicechannels") return reply(i,g.channels.cache.filter(c=>n==="textchannels"?c.type===ChannelType.GuildText:[ChannelType.GuildVoice,ChannelType.GuildStageVoice].includes(c.type)).map(c=>c.toString()).slice(0,80).join(" ")||"None");
    if(n==="channelinfo"){const c=i.options.getChannel("channel",false)||i.channel;return reply(i,`**${c.name}** • ID: ${c.id} • Type: ${c.type} • Created: <t:${Math.floor(c.createdTimestamp/1000)}:F>`);}
    if(n==="modstats"){const total=db.prepare("SELECT COUNT(*) n FROM warnings WHERE guild_id=?").get(g.id).n;return reply(i,`⚖️ Warnings recorded in this server: **${total}**`);}
    if(n==="warnings"||n==="clearwarnings"){
      need(PermissionFlagsBits.ModerateMembers);const t=safeTarget();
      if(n==="clearwarnings"){const r=db.prepare("DELETE FROM warnings WHERE guild_id=? AND user_id=?").run(g.id,t.id);return reply(i,`Cleared ${r.changes} warning(s) for ${t.user.tag}.`);}
      const rows=db.prepare("SELECT * FROM warnings WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT 10").all(g.id,t.id);
      return reply(i,rows.length?rows.map(w=>`#${w.id} • <t:${Math.floor(w.created_at/1000)}:d> • ${w.reason} • moderator <@!${w.moderator_id}>`).join("\n"):`${t.user.tag} has no recorded warnings.`);
    }
    if(n==="case"){need(PermissionFlagsBits.ModerateMembers);const c=db.prepare("SELECT * FROM warnings WHERE guild_id=? AND id=?").get(g.id,i.options.getInteger("id"));return reply(i,c?`Case #${c.id}: <@!${c.user_id}> • ${c.reason} • moderator <@!${c.moderator_id}>`:"Warning case not found.");}
    if(n==="warn"){need(PermissionFlagsBits.ModerateMembers);const t=safeTarget();warn(t.id,reason);return reply(i,`⚠️ Warned ${t.user.tag}. Reason: ${reason}`);}
    if(n==="kick"){need(PermissionFlagsBits.KickMembers);botNeed(PermissionFlagsBits.KickMembers);const t=safeTarget();if(!t.kickable)throw new Error("My role must be above that member.");await t.kick(reason);return reply(i,`👢 Kicked ${t.user.tag}. Reason: ${reason}`);}
    if(n==="ban"||n==="softban"){need(PermissionFlagsBits.BanMembers);botNeed(PermissionFlagsBits.BanMembers);const t=safeTarget();if(!t.bannable)throw new Error("My role must be above that member.");await t.ban({reason,deleteMessageSeconds:n==="softban"?604800:0});if(n==="softban")await g.bans.remove(t.id,"Softban complete");return reply(i,`🔨 ${n==="softban"?"Softbanned":"Banned"} ${t.user.tag}. Reason: ${reason}`);}
    if(n==="unban"){need(PermissionFlagsBits.BanMembers);botNeed(PermissionFlagsBits.BanMembers);const id=i.options.getString("user_id");await g.bans.remove(id,reason);return reply(i,`Unbanned user ${id}.`);}
    if(n==="timeout"||n==="untimeout"){need(PermissionFlagsBits.ModerateMembers);botNeed(PermissionFlagsBits.ModerateMembers);const t=safeTarget();if(!t.moderatable)throw new Error("My role must be above that member.");await t.timeout(n==="timeout"?i.options.getInteger("minutes")*60000:null,reason);return reply(i,n==="timeout"?`Timed out ${t.user.tag}.`:`Removed timeout for ${t.user.tag}.`);}
    if(["nickname","nick","setnick"].includes(n)){need(PermissionFlagsBits.ManageNicknames);botNeed(PermissionFlagsBits.ManageNicknames);const t=safeTarget();if(!t.manageable)throw new Error("My role must be above that member.");const nick=i.options.getString("nickname")||"";await t.setNickname(nick||null,reason);return reply(i,`Nickname ${nick?"updated":"cleared"} for ${t.user.tag}.`);}
    if(n==="roleadd"||n==="roleremove"){need(PermissionFlagsBits.ManageRoles);botNeed(PermissionFlagsBits.ManageRoles);const t=safeTarget(),r=i.options.getRole("role");if(r.position>=me.roles.highest.position||r.managed)throw new Error("I cannot manage that role due to role hierarchy.");await t.roles[n==="roleadd"?"add":"remove"](r,reason);return reply(i,`${n==="roleadd"?"Added":"Removed"} ${r.name} ${n==="roleadd"?"to":"from"} ${t.user.tag}.`);}
    if(n==="voicekick"||n==="move"){need(PermissionFlagsBits.MoveMembers);botNeed(PermissionFlagsBits.MoveMembers);const t=safeTarget();if(!t.voice.channel)throw new Error("That member is not in voice.");await t.voice.setChannel(n==="move"?i.options.getChannel("channel"):null,reason);return reply(i,n==="move"?`Moved ${t.user.tag}.`:`Disconnected ${t.user.tag} from voice.`);}
    if(n==="purge"||n==="purgeuser"||n==="cleanbot"||n==="purgeattachments"||n==="purgeembeds"){need(PermissionFlagsBits.ManageMessages);botNeed(PermissionFlagsBits.ManageMessages);const amount=i.options.getInteger("amount")??100;const msgs=await i.channel.messages.fetch({limit:amount});let filtered=msgs;if(n==="purgeuser"){const t=safeTarget();filtered=msgs.filter(m=>m.author.id===t.id);}if(n==="cleanbot")filtered=msgs.filter(m=>m.author.bot);if(n==="purgeattachments")filtered=msgs.filter(m=>m.attachments.size>0);if(n==="purgeembeds")filtered=msgs.filter(m=>m.embeds.length>0);const deleted=await i.channel.bulkDelete(filtered,true);return reply(i,`🧹 Deleted ${deleted.size} message(s). Messages older than 14 days cannot be bulk-deleted.`);}
    if(["lock","emergencylock","unlock","emergencyunlock","lockdown","unlockdown"].includes(n)){need(PermissionFlagsBits.ManageChannels);botNeed(PermissionFlagsBits.ManageChannels);const lock=["lock","emergencylock","lockdown"].includes(n);const channels=n.includes("down")?g.channels.cache.filter(c=>c.type===ChannelType.GuildText):[i.channel];let changed=0;for(const c of channels){if(!c.permissionOverwrites)continue;await c.permissionOverwrites.edit(g.roles.everyone,{SendMessages:lock?false:null,AddReactions:lock?false:null}).catch(()=>{});changed++;}return reply(i,`${lock?"🔒 Locked":"🔓 Unlocked"} ${changed} channel(s).`);}
    if(n==="slowmode"||n==="slowmodeoff"||n==="slowmodecheck"){if(n==="slowmodecheck")return reply(i,`Slowmode: ${i.channel.rateLimitPerUser||0} second(s).`);need(PermissionFlagsBits.ManageChannels);botNeed(PermissionFlagsBits.ManageChannels);const sec=n==="slowmodeoff"?0:i.options.getInteger("seconds");await i.channel.setRateLimitPerUser(sec,reason);return reply(i,`Slowmode set to ${sec} second(s).`);}
    if(n==="topic"){need(PermissionFlagsBits.ManageChannels);botNeed(PermissionFlagsBits.ManageChannels);await i.channel.setTopic(i.options.getString("topic"),reason);return reply(i,"Channel topic updated.");}
    if(n==="announce"||n==="say"||n==="embed"){need(PermissionFlagsBits.ManageMessages);botNeed(PermissionFlagsBits.SendMessages);const c=n==="announce"?(i.options.getChannel("channel")||i.channel):i.channel;if(n==="embed"){const e=new EmbedBuilder().setTitle(i.options.getString("title")).setDescription(i.options.getString("description")).setColor(0x5865F2);await c.send({embeds:[e]});}else await c.send({content:n==="announce"?`📢 **Announcement**\n${i.options.getString("message")}`:i.options.getString("message"),allowedMentions:{parse:[]}});return reply(i,"Message sent.");}
    if(["pin","unpin","clearreactions"].includes(n)){need(PermissionFlagsBits.ManageMessages);botNeed(PermissionFlagsBits.ManageMessages);const id=i.options.getString("message_id");const m=await i.channel.messages.fetch(id);if(n==="pin")await m.pin();if(n==="unpin")await m.unpin();if(n==="clearreactions")await m.reactions.removeAll();return reply(i,`Message ${n==="clearreactions"?"reactions cleared":n==="pin"?"pinned":"unpinned"}.`);}
    if(n==="unpinall"){need(PermissionFlagsBits.ManageMessages);botNeed(PermissionFlagsBits.ManageMessages);const pins=await i.channel.messages.fetchPinned();for(const m of pins.values())await m.unpin().catch(()=>{});return reply(i,`Unpinned ${pins.size} message(s).`);}
    if(n==="audit"){need(PermissionFlagsBits.ViewAuditLog);botNeed(PermissionFlagsBits.ViewAuditLog);const logs=await g.fetchAuditLogs({limit:i.options.getInteger("amount")||5});return reply(i,logs.entries.map(e=>`• ${e.action} — ${e.target?.tag||e.target?.name||e.targetId||"Unknown"} — <t:${Math.floor(e.createdTimestamp/1000)}:R>`).join("\n")||"No recent entries.");}
    return reply(i,"This command is not implemented yet. Please report this to the bot owner.");
  } catch(e) {
    console.error(`Command ${i.commandName} failed:`,e);
    const msg=e.code===50013?"I lack a required permission. Check my server permissions and role position.":e.code===10007?"That member could not be found.":e.code===10008?"That message could not be found.":e.message||"Unexpected error.";
    if(i.deferred||i.replied) await i.followUp({content:`❌ ${msg}`,ephemeral:true}).catch(()=>{});
    else await i.reply({content:`❌ ${msg}`,ephemeral:true}).catch(()=>{});
  }
});
client.on("messageCreate",async message=>{if(message.author.bot||!message.guild||!message.content)return;const prefix=getPrefix(message.guild);if(!message.content.startsWith(prefix))return;const parts=message.content.slice(prefix.length).trim().split(/\s+/);const command=(parts.shift()||"").toLowerCase();if(!command)return;if(command==="commands"||command==="help"){const page=Math.max(1,Math.min(commandPages(prefix).length,Number(parts[0])||1));return message.reply({embeds:[commandEmbed(message.guild,page)]});}if(command==="prefix"){if(!message.member.permissions.has(PermissionFlagsBits.ManageGuild))return message.reply("❌ You need Manage Server to change the prefix.");const p=parts[0];if(!p||p.length>5||/\s/.test(p))return message.reply("❌ Prefix must be 1-5 non-space characters.");setPrefix(message.guild,p);return message.reply("✅ Prefix changed to `"+p+"`. Use `"+p+"commands`.");}return message.reply("ℹ️ Use `/"+command+"` for this action, or `"+prefix+"commands` for the command guide.");});
client.login(process.env.DISCORD_BOT_TOKEN).then(()=>console.log("Discord login request accepted; waiting for READY event...")).catch(e=>{console.error("Discord login failed:",e);process.exit(1);});
