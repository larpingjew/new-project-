# Safe Chaos Demo Bot

A small discord.py bot with `!ping`, `!chaos-demo`, `/ping`, and `/chaos-demo`. The chaos command is a visual-only demo and does not mass-edit members, create channels or roles, ban users, or spam messages.

## Deploy on Railway

1. In Railway, create a service from `larpingjew/new-project-`.
2. Set the service's **Root Directory** to `/safe-chaos-bot`.
3. Add `DISCORD_BOT_TOKEN` in Railway's Variables tab. Never commit your token to GitHub.
4. Optional: set `BOT_PREFIX` to a prefix such as `!`.
5. Set the Start Command to `python main.py`. Railway should install dependencies from `requirements.txt`.

## Discord Developer Portal

- Enable **Message Content Intent** to use prefix commands such as `!ping`.
- Invite the bot with the `bot` and `applications.commands` scopes.
- Grant only the permissions needed to send messages and embeds; Administrator is not needed.

## Commands

- `!ping` / `/ping`: show latency.
- `!chaos-demo` / `/chaos-demo`: open a confirmation-based, harmless visual demo.
