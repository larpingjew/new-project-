const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");

const sharp = require("sharp");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const OWNER_ID = process.env.OWNER_ID;

// ==========================================
// PERMISSIONS
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
// PARSE EMOJIS
// ==========================================

function parseEmojis(input) {

    const regex = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;

    const emojis = [];

    let match;

    while ((match = regex.exec(input)) !== null) {

        const full = match[0];

        emojis.push({
            name: match[1],
            id: match[2],
            animated: full.startsWith("<a:")
        });
    }

    return emojis;
}

// ==========================================
// CREATE EMOJI GRID
// ==========================================

async function createEmojiGrid(emojis) {

    const emojiSize = 100;
    const padding = 20;

    const columns = 5;

    const rows = Math.ceil(emojis.length / columns);

    const width =
        (columns * emojiSize) +
        ((columns + 1) * padding);

    const height =
        (rows * emojiSize) +
        ((rows + 1) * padding);

    const svgEmojis = [];

    for (let i = 0; i < emojis.length; i++) {

        const emoji = emojis[i];

        const row = Math.floor(i / columns);
        const column = i % columns;

        const x =
            padding +
            (column * emojiSize) +
            (emojiSize / 2);

        const y =
            padding +
            (row * emojiSize) +
            (emojiSize / 2);

        const extension = emoji.animated
            ? "gif"
            : "png";

        const url =
            `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=128&quality=lossless`;

        svgEmojis.push(`
            <image
                href="${url}"
                x="${x - 40}"
                y="${y - 40}"
                width="80"
                height="80"
                preserveAspectRatio="xMidYMid meet"
            />
        `);
    }

    const svg = `
        <svg
            width="${width}"
            height="${height}"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                width="100%"
                height="100%"
                rx="20"
                fill="#2b2d31"
            />

            ${svgEmojis.join("\n")}
        </svg>
    `;

    return await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
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
                            "Creates an EmojiPack containing up to 50 custom Discord emojis."
                    },
                    {
                        name: "📥 /emojipack load",
                        value:
                            "Loads an EmojiPack into a Discord server."
                    },
                    {
                        name: "📦 /emojipacks",
                        value:
                            "Shows all available EmojiPacks."
                    },
                    {
                        name: "👀 /emojipack view",
                        value:
                            "Shows the actual emojis inside an EmojiPack."
                    },
                    {
                        name: "🗑️ /emojipack delete",
                        value:
                            "Permanently deletes an EmojiPack."
                    },
                    {
                        name: "👑 /emojipack admin add",
                        value:
                            "Adds an EmojiPack admin. Bot owner only."
                    },
                    {
                        name: "👑 /emojipack admin remove",
                        value:
                            "Removes an EmojiPack admin. Bot owner only."
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
        // EMOJIPACK COMMAND
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
                        "❌ I couldn't find any valid custom Discord emojis.",
                    ephemeral: true
                });
            }

            if (emojis.length > 50) {

                return interaction.reply({
                    content:
                        `❌ You provided **${emojis.length} emojis**. Maximum is **50**.`,
                    ephemeral: true
                });
            }

            const uniqueIds = new Set(
                emojis.map(emoji => emoji.id)
            );

            if (uniqueIds.size !== emojis.length) {

                return interaction.reply({
                    content:
                        "❌ You cannot use the same emoji more than once.",
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

            await interaction.deferReply();

            try {

                const image = await createEmojiGrid(
                    emojis.map(emoji => ({
                        id: emoji.emoji_id,
                        name: emoji.emoji_name,
                        animated: Boolean(emoji.emoji_animated)
                    }))
                );

                const attachment = new AttachmentBuilder(
                    image,
                    {
                        name: "emojipack.png"
                    }
                );

                const embed = new EmbedBuilder()
                    .setTitle(`📦 EmojiPack: ${pack.name}`)
                    .setDescription(
                        `**${emojis.length}/50 emojis**\n\n` +
                        `Use **/emojipack load** to add this pack to a server.`
                    )
                    .setImage("attachment://emojipack.png")
                    .addFields({
                        name: "Created by",
                        value: `<@${pack.creator_id}>`
                    })
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed],
                    files: [attachment]
                });

            } catch (error) {

                console.error(
                    "Failed to create emoji preview:",
                    error
                );

                return interaction.editReply(
                    "❌ I couldn't create the emoji preview."
                );
            }
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
                    content:
                        "❌ You are not an EmojiPack admin.",
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
        // ADMIN
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
