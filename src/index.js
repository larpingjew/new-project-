const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const OWNER_ID = process.env.OWNER_ID;

// ==========================================
// PERMISSION FUNCTIONS
// ==========================================

function isOwner(userId) {
    return userId === OWNER_ID;
}

function isAdmin(userId) {

    if (isOwner(userId)) {
        return true;
    }

    const admin = db
        .prepare("SELECT user_id FROM admins WHERE user_id = ?")
        .get(userId);

    return !!admin;
}

// ==========================================
// PARSE DISCORD EMOJIS
// ==========================================

function parseEmojis(input) {

    const regex = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;

    const emojis = [];

    let match;

    while ((match = regex.exec(input)) !== null) {

        const full = match[0];

        const animated = full.startsWith("<a:");

        emojis.push({
            name: match[1],
            id: match[2],
            animated
        });
    }

    return emojis;
}

// ==========================================
// BOT READY
// ==========================================

client.once("ready", () => {

    console.log("--------------------------------");
    console.log(`Logged in as ${client.user.tag}`);
    console.log("EmojiPack is online!");
    console.log("--------------------------------");

});

// ==========================================
// INTERACTIONS
// ==========================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {

        // ======================================
        // /help
        // ======================================

        if (interaction.commandName === "help") {

            const embed = new EmbedBuilder()
                .setTitle("📦 EmojiPack Help")
                .setDescription(
                    "EmojiPack lets you save and share Discord emoji packs."
                )
                .addFields(

                    {
                        name: "📤 /emojipack upload",
                        value:
                            "Creates a new EmojiPack. Admins can save up to **50 custom Discord emojis** in one pack."
                    },

                    {
                        name: "📥 /emojipack load",
                        value:
                            "Loads an EmojiPack into a Discord server. The bot must already be in the server and have **Manage Expressions** permission."
                    },

                    {
                        name: "📦 /emojipacks",
                        value:
                            "Shows all EmojiPacks, their emoji count, creator and creation date."
                    },

                    {
                        name: "👀 /emojipack view",
                        value:
                            "Shows all emojis stored inside a specific EmojiPack."
                    },

                    {
                        name: "🗑️ /emojipack delete",
                        value:
                            "Permanently deletes an EmojiPack. EmojiPack admins only."
                    },

                    {
                        name: "👑 /emojipack admin add",
                        value:
                            "Adds a user as an EmojiPack admin. Bot owner only."
                    },

                    {
                        name: "👑 /emojipack admin remove",
                        value:
                            "Removes a user's EmojiPack admin access. Bot owner only."
                    }

                )
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        // ======================================
        // /emojipacks
        // ======================================

        if (interaction.commandName === "emojipacks") {

            const packs = db
                .prepare(`
                    SELECT
                        packs.name,
                        packs.created_at,
                        packs.creator_id,
                        COUNT(emojis.id) AS emoji_count
                    FROM packs
                    LEFT JOIN emojis
                        ON packs.name = emojis.pack_name
                    GROUP BY packs.name
                    ORDER BY packs.created_at DESC
                `)
                .all();

            if (packs.length === 0) {

                return interaction.reply(
                    "📦 There are currently no EmojiPacks."
                );
            }

            const description = packs.map((pack, index) => {

                return [
                    `**${index + 1}. ${pack.name}**`,
                    `> 📦 Emojis: **${pack.emoji_count}/50**`,
                    `> 📅 Created: <t:${Math.floor(pack.created_at / 1000)}:R>`,
                    `> 👤 Creator: <@${pack.creator_id}>`
                ].join("\n");

            }).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle("📦 EmojiPacks")
                .setDescription(description)
                .setTimestamp();

            return interaction.reply({
                embeds: [embed]
            });
        }

        // ======================================
        // /emojipack
        // ======================================

        if (interaction.commandName !== "emojipack") {
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        // ======================================
        // UPLOAD
        // ======================================

        if (
            subcommand === "upload" &&
            !interaction.options.getSubcommandGroup()
        ) {

            if (!isAdmin(interaction.user.id)) {

                return interaction.reply({
                    content: "❌ You are not an EmojiPack admin.",
                    ephemeral: true
                });
            }

            const name = interaction.options
                .getString("name")
                .trim();

            const emojiInput = interaction.options
                .getString("emojis")
                .trim();

            if (name.length < 1 || name.length > 50) {

                return interaction.reply({
                    content:
                        "❌ The EmojiPack name must be between 1 and 50 characters.",
                    ephemeral: true
                });
            }

            const existing = db
                .prepare("SELECT name FROM packs WHERE name = ?")
                .get(name);

            if (existing) {

                return interaction.reply({
                    content:
                        `❌ An EmojiPack named **${name}** already exists.`,
                    ephemeral: true
                });
            }

            const emojis = parseEmojis(emojiInput);

            if (emojis.length === 0) {

                return interaction.reply({
                    content:
                        "❌ I couldn't find any valid custom Discord emojis.\n\n" +
                        "Example: `<:emoji:123456789>`",
                    ephemeral: true
                });
            }

            if (emojis.length > 50) {

                return interaction.reply({
                    content:
                        `❌ You provided **${emojis.length} emojis**.\n` +
                        "An EmojiPack can contain a maximum of **50 emojis**.",
                    ephemeral: true
                });
            }

            // Remove duplicate emoji IDs
            const uniqueIds = new Set(
                emojis.map(emoji => emoji.id)
            );

            if (uniqueIds.size !== emojis.length) {

                return interaction.reply({
                    content:
                        "❌ You cannot use the same emoji more than once in a pack.",
                    ephemeral: true
                });
            }

            const createPack = db.transaction(() => {

                db.prepare(`
                    INSERT INTO packs
                    (name, created_at, creator_id)
                    VALUES (?, ?, ?)
                `).run(
                    name,
                    Date.now(),
                    interaction.user.id
                );

                const insertEmoji = db.prepare(`
                    INSERT INTO emojis
                    (pack_name, emoji_name, emoji_id, emoji_animated)
                    VALUES (?, ?, ?, ?)
                `);

                for (const emoji of emojis) {

                    insertEmoji.run(
                        name,
                        emoji.name,
                        emoji.id,
                        emoji.animated ? 1 : 0
                    );
                }

            });

            createPack();

            return interaction.reply(
                `✅ EmojiPack **${name}** created successfully!\n\n` +
                `📦 Emojis saved: **${emojis.length}/50**`
            );
        }

        // ======================================
        // VIEW
        // ======================================

        if (
            subcommand === "view" &&
            !interaction.options.getSubcommandGroup()
        ) {

            const name = interaction.options
                .getString("name")
                .trim();

            const pack = db
                .prepare("SELECT * FROM packs WHERE name = ?")
                .get(name);

            if (!pack) {

                return interaction.reply({
                    content:
                        `❌ EmojiPack **${name}** doesn't exist.`,
                    ephemeral: true
                });
            }

            const emojis = db
                .prepare(`
                    SELECT *
                    FROM emojis
                    WHERE pack_name = ?
                    ORDER BY id ASC
                `)
                .all(name);

            const emojiDisplay = emojis
                .map(emoji => {

                    if (emoji.emoji_animated) {
                        return `<a:${emoji.emoji_name}:${emoji.emoji_id}>`;
                    }

                    return `<:${emoji.emoji_name}:${emoji.emoji_id}>`;

                })
                .join(" ");

            const embed = new EmbedBuilder()
                .setTitle(`📦 EmojiPack: ${pack.name}`)
                .setDescription(
                    `${emojiDisplay}\n\n` +
                    `📦 **${emojis.length}/50 emojis**\n\n` +
                    `**Load this pack:**\n` +
                    `\`/emojipack load\`\n` +
                    `Then enter the pack name and destination server ID.`
                )
                .addFields({
                    name: "Created by",
                    value: `<@${pack.creator_id}>`
                })
                .setTimestamp();

            return interaction.reply({
                embeds: [embed]
            });
        }

        // ======================================
        // DELETE
        // ======================================

        if (
            subcommand === "delete" &&
            !interaction.options.getSubcommandGroup()
        ) {

            if (!isAdmin(interaction.user.id)) {

                return interaction.reply({
                    content: "❌ You are not an EmojiPack admin.",
                    ephemeral: true
                });
            }

            const name = interaction.options
                .getString("name")
                .trim();

            const pack = db
                .prepare("SELECT * FROM packs WHERE name = ?")
                .get(name);

            if (!pack) {

                return interaction.reply({
                    content:
                        `❌ EmojiPack **${name}** doesn't exist.`,
                    ephemeral: true
                });
            }

            db.prepare(
                "DELETE FROM emojis WHERE pack_name = ?"
            ).run(name);

            db.prepare(
                "DELETE FROM packs WHERE name = ?"
            ).run(name);

            return interaction.reply(
                `🗑️ EmojiPack **${name}** has been permanently deleted.`
            );
        }

        // ======================================
        // LOAD
        // ======================================

        if (
            subcommand === "load" &&
            !interaction.options.getSubcommandGroup()
        ) {

            const name = interaction.options
                .getString("name")
                .trim();

            const serverId = interaction.options
                .getString("server_id")
                .trim();

            const pack = db
                .prepare("SELECT * FROM packs WHERE name = ?")
                .get(name);

            if (!pack) {

                return interaction.reply({
                    content:
                        `❌ EmojiPack **${name}** doesn't exist.`,
                    ephemeral: true
                });
            }

            let guild;

            try {

                guild = await client.guilds.fetch(serverId);

            } catch {

                return interaction.reply({
                    content:
                        "❌ I am not in that server.\n\n" +
                        "Please add me to the server first, then try again.",
                    ephemeral: true
                });
            }

            const botMember = await guild.members.fetchMe();

            if (!botMember.permissions.has("ManageGuildExpressions")) {

                return interaction.reply({
                    content:
                        `❌ I don't have **Manage Expressions** permission in **${guild.name}**.`,
                    ephemeral: true
                });
            }

            const emojis = db
                .prepare(`
                    SELECT *
                    FROM emojis
                    WHERE pack_name = ?
                    ORDER BY id ASC
                `)
                .all(name);

            await interaction.deferReply();

            let added = 0;
            let failed = 0;

            for (const emoji of emojis) {

                try {

                    await guild.emojis.create({
                        attachment:
                            `https://cdn.discordapp.com/emojis/${emoji.emoji_id}.${emoji.emoji_animated ? "gif" : "png"}`,
                        name: emoji.emoji_name
                    });

                    added++;

                } catch (error) {

                    console.error(
                        `Failed to add ${emoji.emoji_name}:`,
                        error.message
                    );

                    failed++;
                }
            }

            return interaction.editReply(
                `📦 Finished loading **${name}** into **${guild.name}**.\n\n` +
                `✅ Added: **${added}**\n` +
                `❌ Failed: **${failed}**`
            );
        }

        // ======================================
        // ADMIN ADD / REMOVE
        // ======================================

        if (
            interaction.options.getSubcommandGroup() === "admin"
        ) {

            if (!isOwner(interaction.user.id)) {

                return interaction.reply({
                    content:
                        "❌ Only the bot owner can manage EmojiPack admins.",
                    ephemeral: true
                });
            }

            const action = interaction.options.getSubcommand();

            const user = interaction.options.getUser("user");

            if (action === "add") {

                db.prepare(`
                    INSERT OR IGNORE INTO admins (user_id)
                    VALUES (?)
                `).run(user.id);

                return interaction.reply(
                    `✅ ${user} is now an **EmojiPack admin**.`
                );
            }

            if (action === "remove") {

                db.prepare(`
                    DELETE FROM admins
                    WHERE user_id = ?
                `).run(user.id);

                return interaction.reply(
                    `✅ ${user} is no longer an **EmojiPack admin**.`
                );
            }
        }

    } catch (error) {

        console.error("Interaction error:", error);

        if (interaction.replied || interaction.deferred) {

            await interaction.editReply(
                "❌ Something went wrong while processing that command."
            );

        } else {

            await interaction.reply({
                content: "❌ Something went wrong.",
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
