import os
import discord
from discord.ext import commands
from discord import app_commands

TOKEN = os.getenv("DISCORD_BOT_TOKEN")
PREFIX = os.getenv("BOT_PREFIX", "!")

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix=PREFIX, intents=intents)

class DemoConfirmView(discord.ui.View):
    def __init__(self, requester_id: int):
        super().__init__(timeout=30)
        self.requester_id = requester_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.requester_id:
            await interaction.response.send_message("Only the person who started this demo can use these buttons.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Confirm demo", style=discord.ButtonStyle.primary)
    async def confirm_demo(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = discord.Embed(
            title="🌀 Chaos demo",
            description="Demo confirmed! This is a harmless preview only. No nicknames, channels, roles, bans, or mass messages were changed or created.",
            color=discord.Color.blurple(),
        )
        await interaction.response.edit_message(embed=embed, view=None)

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.secondary)
    async def cancel_demo(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.edit_message(content="Demo cancelled. No server changes were made.", embed=None, view=None)

@bot.event
async def on_ready():
    try:
        synced = await bot.tree.sync()
        print(f"Logged in as {bot.user}; synced {len(synced)} slash commands.")
    except discord.HTTPException as exc:
        print(f"Slash-command sync failed: {exc}")

@bot.command(name="ping")
async def ping(ctx: commands.Context):
    """Check whether the bot is online."""
    await ctx.reply(f"Pong! {round(bot.latency * 1000)} ms", mention_author=False)

@bot.command(name="chaos-demo")
@commands.guild_only()
async def chaos_demo_prefix(ctx: commands.Context):
    """Show a harmless, confirmation-based chaos demo."""
    embed = discord.Embed(title="🌀 Chaos protocol — demo", description="This is a visual-only demo. Confirming it will not modify the server, rename members, create channels or roles, ban anyone, or mass-message.", color=discord.Color.blurple())
    await ctx.reply(embed=embed, view=DemoConfirmView(ctx.author.id), mention_author=False)

@bot.tree.command(name="chaos-demo", description="Run a harmless, confirmation-based chaos demo.")
@app_commands.guild_only()
async def chaos_demo_slash(interaction: discord.Interaction):
    embed = discord.Embed(title="🌀 Chaos protocol — demo", description="This is a visual-only demo. Confirming it will not modify the server, rename members, create channels or roles, ban anyone, or mass-message.", color=discord.Color.blurple())
    await interaction.response.send_message(embed=embed, view=DemoConfirmView(interaction.user.id), ephemeral=True)

@bot.tree.command(name="ping", description="Check whether the bot is online.")
async def ping_slash(interaction: discord.Interaction):
    await interaction.response.send_message(f"Pong! {round(bot.latency * 1000)} ms", ephemeral=True)

if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("Missing DISCORD_BOT_TOKEN environment variable.")
    bot.run(TOKEN)
