const Database = require("better-sqlite3");

const db = new Database("emojipack.db");

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS packs (
        name TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        creator_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emojis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pack_name TEXT NOT NULL,
        emoji_name TEXT NOT NULL,
        emoji_id TEXT NOT NULL,
        emoji_animated INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (pack_name) REFERENCES packs(name) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
        user_id TEXT PRIMARY KEY
    );
`);

module.exports = db;
