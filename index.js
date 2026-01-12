const { Telegraf } = require("telegraf");
const fs = require("fs");
const { exec, execSync } = require("child_process");
require("dotenv").config();
const path = require("path");
const configs = require("./config");

const bot = new Telegraf(configs.BOT_TOKEN);
const OWNER_ID = 8462359928; 

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const apiId = 26850449;
const apiHash = "72a730c380e68095a8549ad7341b0608";

const client = new TelegramClient(
  new StringSession(""),
  apiId,
  apiHash,
  { connectionRetries: 5 }
);






bot.command("get", async (ctx) => {
  try {
    const reply = ctx.message.reply_to_message;
    if (!reply)
      return ctx.reply("❌ Kisi media par reply karke /get likho");

    await ctx.reply("⏬ Downloading...");

    // Chat info
    const chatId = reply.chat.id;
    const msgId = reply.message_id;

    // GramJS fetch
    const msgs = await gramClient.getMessages(chatId, {
      ids: msgId
    });

    const msg = msgs[0];
    if (!msg.media)
      return ctx.reply("❌ Is message me media nahi hai");

    const filePath = path.join(__dirname, `media_${Date.now()}`);

    await gramClient.downloadMedia(msg, {
      file: filePath
    });

    // Auto-detect media type
    if (msg.photo) {
      await ctx.replyWithPhoto({ source: filePath });
    } else if (msg.video) {
      await ctx.replyWithVideo({ source: filePath });
    } else if (msg.document) {
      await ctx.replyWithDocument({ source: filePath });
    } else if (msg.audio) {
      await ctx.replyWithAudio({ source: filePath });
    } else {
      await ctx.replyWithDocument({ source: filePath });
    }

    fs.unlinkSync(filePath); // cleanup

  } catch (e) {
    console.error(e);
    ctx.reply("❌ Download failed");
  }
});



(async () => {
  await client.start({ botAuthToken: configs.BOT_TOKEN });
  console.log("✅ GramJS connected");
})();

// ---------------- Launch bot ----------------
bot.launch()
    .then(() => console.log("✅ Bot is running..."))
    .catch(err => console.error("❌ Failed to launch bot:", err));

// ---------------- Graceful shutdown ----------------
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
