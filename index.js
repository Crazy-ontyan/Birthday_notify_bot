import { serve } from "@hono/node-server";
import healthCheckServer from "./server.js";
import "dotenv/config";

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import mongoose from "mongoose";

export const CRON_SECRET = process.env.CRON_SECRET;

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;

//MongoDBのデータ構造を定義
const birthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  birthday: { type: String, required: true }
});
const Birthday = mongoose.model('Birthday', birthdaySchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  console.log(`${client.user.tag} としてログインしました`);

  //MongoDBに接続
  try {
    await mongoose.connect(MONGO_URL);
    console.log("MongoDBに接続しました");
  } catch (err) {
    console.error("MongoDB接続エラー", err);
  }

  //スラッシュコマンドの登録
  const commands = [
    new SlashCommandBuilder()
      .setName("birthday")
      .setDescription("誕生日を設定します")
      .addIntegerOption(opt => opt.setName("month").setDescription("月(1-12)").setRequired(true).setMinValue(1).setMaxValue(12))
      .addIntegerOption(opt => opt.setName("day").setDescription("日(1-31)").setRequired(true).setMinValue(1).setMaxValue(31))
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("スラッシュコマンドの登録に成功しました");
  } catch (err) {
    console.error("コマンド登録エラー", err);
  }
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "こんにちは") {
    message.channel.send("こんにちは！");
  }
});

//スラッシュコマンドの受信処理
client.on("interactionCreate", async (interaction) => {
  if(!interaction.isChatInputCommand()) return;

  if(interaction.commandName === "birthday") {
    const month = interaction.options.getInteger("month");
    const day = interaction.options.getInteger("day");
    const userId = interaction.user.id;
    const userName = interaction.user.displayName;
    const formattedDate = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    try {
      await Birthday.findOneAndUpdate(
        { userId: userId },
        { birthday: formattedDate },
        { upsert: true, new: true }
      );
      await interaction.reply({ content: `${userName}の誕生日を${month}月${day}日に登録しました！`, ephemeral: true});
    } catch (error) {
      console.error("誕生日保存エラー:", error);
      await interaction.reply({ content: "誕生日の登録中にエラーが発生しました。", ephemeral: true});
    }
  }
});

//誕生日をチェックして通知する関数
export async function checkAndNotifyBirthdays() {
  if(!NOTIFY_CHANNEL_ID) throw new Error("NOTIFY_CHANNEL_ID が設定されていません");

  const channel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
  if(!channel) throw new Error("チャンネルが見つかりません");

  //日本時間の今日の日付を取得
  const today = new Date(Date.now() + ((new Date().getTimezoneOffset() + 540) * 60000));
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const currentDay = String(today.getDate()).padStart(2, "0");
  const todayStr = `${currentMonth}-${currentDay}`;

  const matches = await Birthday.find({ birthday: todayStr });

  if(matches.length > 0) {
    const celebratedUsers = matches.map(user => `<@${user.userId}>`);
    await channel.send(`🎉 **Happy Birthday!** 🎉\n今日は${celebratedUsers.join(', ')}の誕生日です！ おめでとうございます！✨`)
  }
  return matches.length;
}

//ここにtokenを入れる
client.login(TOKEN);

//Koyeb用のヘルスチェックサーバーを起動
serve({
  fetch: healthCheckServer.fetch,
  port: 8000,
});
