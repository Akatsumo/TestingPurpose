const { Telegraf } = require("telegraf");
const fs = require("fs");
const { exec, execSync } = require("child_process");
require("dotenv").config();
const configs = require("./config");

const bot = new Telegraf(configs.BOT_TOKEN);
const OWNER_ID = 8462359928; // Change to your Telegram ID

// ---------------- Helper: Check owner ----------------
function isOwner(ctx) {
    return ctx.from && ctx.from.id === OWNER_ID;
}

// ---------------- Helper: Reply or edit ----------------
async function editOrReply(ctx, text, extra = {}) {
    if (isOwner(ctx)) {
        await ctx.reply(text, extra);
    } else {
        await ctx.reply("❌ You are not allowed.");
    }
}

// ---------------- /start command ----------------
bot.command("start", async (ctx) => {
    await ctx.reply("🤖 Bot is running! Use /eval, /sh, /update commands.");
});

// ---------------- /eval command ----------------
bot.command("eval", async (ctx) => {
    if (!isOwner(ctx)) return;

    const code = ctx.message.text.split(" ").slice(1).join(" ");
    if (!code) return editOrReply(ctx, "<b>No code provided!</b>");

    let output = "";

    try {
        // Capture console.log inside eval
        let logs = [];
        const log = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        // Async eval
        const asyncEval = async () => eval(code);
        const result = await asyncEval();

        console.log = log; // restore console.log

        output = logs.join("\n");
        if (result !== undefined) output += (output ? "\n" : "") + String(result);
        if (!output) output = "success";
    } catch (err) {
        output = err.stack || String(err);
    }

    // If output too long, send as document
    if (output.length > 4000) {
        const filename = "eval_output.txt";
        fs.writeFileSync(filename, output, "utf8");
        await ctx.replyWithDocument({ source: filename }, { caption: "<b>Eval Result</b>", parse_mode: "HTML" });
        fs.unlinkSync(filename);
    } else {
        await ctx.reply(`<b>📕 Eval Result:</b>\n<pre>${output}</pre>`, { parse_mode: "HTML" });
    }
});

// ---------------- /sh command ----------------
bot.command("sh", async (ctx) => {
    if (!isOwner(ctx)) return;

    const cmd = ctx.message.text.split(" ").slice(1).join(" ");
    if (!cmd) return editOrReply(ctx, "<b>Example: /sh git pull</b>");

    exec(cmd, { shell: true }, async (error, stdout, stderr) => {
        let output = stdout + stderr;
        if (!output) output = "success";

        if (output.length > 4000) {
            const filename = "shell_output.txt";
            fs.writeFileSync(filename, output, "utf8");
            await ctx.replyWithDocument({ source: filename }, { caption: "<b>Shell Output</b>", parse_mode: "HTML" });
            fs.unlinkSync(filename);
        } else {
            await ctx.reply(`<b>💻 Shell Output:</b>\n<pre>${output}</pre>`, { parse_mode: "HTML" });
        }
    });
});

// ---------------- /update command ----------------
bot.command("update", async (ctx) => {
    if (!isOwner(ctx)) return;

    const msg = await ctx.reply("🔄 Pulling latest changes...");
    try {
        execSync("git pull");
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, "✅ Changes pulled! Restarting bot...");

        // Restart bot with pm2 or fallback to node
        const pm2Name = process.env.PM2_NAME || "bot";
        try {
            execSync(`pm2 restart ${pm2Name}`);
        } catch {
            execSync(`node index.js`);
        }
    } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `<b>Error:</b>\n<pre>${err.message}</pre>`, { parse_mode: "HTML" });
    }
});

// ---------------- Launch bot ----------------
bot.launch()
    .then(() => console.log("✅ Bot is running..."))
    .catch(err => console.error("❌ Failed to launch bot:", err));

// ---------------- Graceful shutdown ----------------
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
