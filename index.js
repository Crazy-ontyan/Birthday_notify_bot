import { serve } from "@hono/node-server";
import healthCheckServer from "./server.js";
import "dotenv/config";

import { Client, GatewayIntentBits } from "discord.js";

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

//Koyeb用のヘルスチェックサーバーを起動
serve({
  fetch: healthCheckServer.fetch,
  port: 8000,
});
