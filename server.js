import { Hono } from "hono";
import { checkAndNotifyBirthdays, CRON_SECRET } from "./index.js";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Discord Bot is running",
    node_version: process.version,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/cron", async (c) => {
  if (CRON_SECRET && c.req.query("secret") !== CRON_SECRET) {
    return c.text("Unauthorized", 401);
  }

  try {
    const count = await checkAndNotifyBirthdays();
    return c.json({
      success: true,
      message: `チェック完了. 誕生日該当者: ${count}人`,
    });
  } catch (err) {
    console.error("外部Cronトリガーエラー", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
