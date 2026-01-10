const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require("fs");
const configs = require('./config');
const { exec, execSync } = require("child_process");
require("dotenv").config();


const bot = new Telegraf(configs.BOT_TOKEN);



const OWNER_ID = 8462359928;


bot.command("start", async (ctx) => {
     await ctx.reply("testing....")
})
// Helper: Edit or Reply
async function editOrReply(ctx, text, extra = {}) {
    if (ctx.message?.from.id === OWNER_ID) {
        await ctx.reply(text, extra);
    } else {
        await ctx.reply("❌ You are not allowed.");
    }
}

// ================== /eval command ==================
bot.command("eval", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;

    const cmd = ctx.message.text.split(" ").slice(1).join(" ");
    if (!cmd) return editOrReply(ctx, "<b>No command given!</b>");

    let result = "";
    try {
        // Evaluate JS code dynamically
        const asyncEval = async () => eval(cmd);
        const output = await asyncEval();
        result = output === undefined ? "success" : String(output);
    } catch (err) {
        result = err.stack || String(err);
    }

    if (result.length > 4000) {
        const filename = "output.txt";
        fs.writeFileSync(filename, result, "utf8");
        await ctx.replyWithDocument({ source: filename }, { caption: "<b>Eval Result</b>" });
        fs.unlinkSync(filename);
    } else {
        await ctx.reply(`<b>📕 Result :</b>\n<pre>${result}</pre>`, { parse_mode: "HTML" });
    }
});

// ================== /sh command ==================
bot.command("sh", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;

    const cmd = ctx.message.text.split(" ").slice(1).join(" ");
    if (!cmd) return editOrReply(ctx, "<b>Example: /sh git pull</b>");

    exec(cmd, { shell: true }, async (error, stdout, stderr) => {
        let output = stdout + stderr;
        if (!output) output = "success";

        if (output.length > 4000) {
            const filename = "output.txt";
            fs.writeFileSync(filename, output, "utf8");
            await ctx.replyWithDocument({ source: filename }, { caption: `<code>Shell Output</code>` });
            fs.unlinkSync(filename);
        } else {
            await ctx.reply(`<b>OUTPUT :</b>\n<pre>${output}</pre>`, { parse_mode: "HTML" });
        }
    });
});

// ================== /update command ==================
bot.command("update", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;

    const msg = await ctx.reply("Pulling latest changes...");
    try {
        execSync("git pull");
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, "Changes pulled! Restarting bot...");
        // Restart bot
        execSync(`pm2 restart ${process.env.PM2_NAME || 'bot'}`); // or node restart
    } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `Error: ${err.message}`);
    }
});



// --------- Start-QuizBot ---------- //

bot.launch().then(() => {
  console.log('QuizBot is running...');
}).catch((err) => {
  console.error('Failed to launch QuizBot:', err);
});


process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));



module.exports = bot;
