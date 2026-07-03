const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`${client.user.tag} としてログインしました`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "こんにちは") {
    message.channel.send("こんにちは！");
  }
});

//ここにtokenを入れる
client.login(process.env.DISCORD_BOT_TOKEN);
