const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const configs = require("./config");

// ---------- Telegraf ----------
const bot = new Telegraf(configs.BOT_TOKEN);
const OWNER_ID = 8462359928;

// ---------- GramJS ----------
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const apiId = 26850449;
const apiHash = "72a730c380e68095a8549ad7341b0608";

const gramClient = new TelegramClient(
  new StringSession(""),
  apiId,
  apiHash,
  { connectionRetries: 5 }
);

// ---------- Start GramJS ----------
(async () => {
  await gramClient.start({
    botAuthToken: configs.BOT_TOKEN
  });
  console.log("✅ GramJS client connected");
})();

// ---------- /get command ----------
bot.command("get", async (ctx) => {
  try {
    const reply = ctx.message.reply_to_message;
    if (!reply) {
      return ctx.reply("❌ Kisi media par reply karke /get likho");
    }

    await ctx.reply("⏬ Downloading media...");

    const chatId = reply.chat.id;
    const msgId = reply.message_id;

    // Fetch message using GramJS
    const messages = await gramClient.getMessages(chatId, {
      ids: msgId
    });

    const msg = messages[0];
    if (!msg || !msg.media) {
      return ctx.reply("❌ Is message me media nahi hai");
    }

    // Create temp folder
    const tempDir = path.join(__dirname, "downloads");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filePath = path.join(tempDir, `media_${Date.now()}`);

    // Download media
    await gramClient.downloadMedia(msg, {
      file: filePath
    });

    // Send media back (auto detect)
    if (msg.photo) {
      await ctx.replyWithPhoto({ source: filePath });
    } else if (msg.video) {
      await ctx.replyWithVideo({ source: filePath });
    } else if (msg.audio) {
      await ctx.replyWithAudio({ source: filePath });
    } else {
      await ctx.replyWithDocument({ source: filePath });
    }

    // Cleanup
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Download error:", err);
    ctx.reply("❌ Download failed");
  }
});

// ---------- Start Bot ----------
bot.launch()
  .then(() => console.log("🤖 Telegraf bot running"))
  .catch(err => console.error("❌ Bot launch failed:", err));

// ---------- Graceful Shutdown ----------
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
