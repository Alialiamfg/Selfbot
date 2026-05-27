const { Client } = require('discord.js-selfbot-v13');
const http = require('http');
const prefix = '!';

http.createServer((req, res) => {

  if (req.url === "/") {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Discord Bot Dashboard</title>
        <meta name="description" content="Discord bot running 24/7 with uptime monitoring">
      </head>
      <body>
        <h1>sergio test</h1>
        <p>Bot is online 24/7 ✅</p>
      </body>
      </html>
    `);
  }

  if (req.url === "/robots.txt") {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end("User-agent: *\nAllow: /");
  }

  res.writeHead(404);
  res.end("Not found");

}).listen(5000, '0.0.0.0', () => {
  console.log('Web server running on port 5000');
});

const ACTIVITY_TYPES = { playing: 0, streaming: 1, listening: 2, watching: 3, competing: 5 };

function setStatus(client, type, name, url) {
  const activity = { name, type: ACTIVITY_TYPES[type] ?? 0 };
  if (type === 'streaming' && url) activity.url = url;
  client.user.setPresence({ status: 'online', activities: [activity] });
}

function clearStatus(client) {
  client.user.setPresence({ status: 'online', activities: [] });
}

const messages = {
  en: {
    help: `**📋 Commands List:**
\`!playing <text>\` — Set status to Playing
\`!watching <text>\` — Set status to Watching
\`!listening <text>\` — Set status to Listening
\`!streaming <text>\` — Set status to Streaming
\`!competing <text>\` — Set status to Competing
\`!clear\` — Clear current status
\`!settime <type> <status> <h.m>\` — Timed status, auto-clears after (e.g. \`!settime playing Gaming 1.30\`)
\`!spam <message> <count>\` — Send a message multiple times
\`!autoreplay <message> <count>\` — Auto-reply to DMs a set number of times
\`!afk <reason> <yes/no>\` — Set AFK (yes = all servers, no = current channel only)
\`!ping\` — Check bot latency
\`!language ar/en\` — Switch language to Arabic or English
\`!help\` — Show this help message`,
    langSet: '✅ Language set to **English**.',
    afkEnabled: (reason, scope) => `💤 AFK enabled: "${reason}" — ${scope}`,
    afkDisabled: '✅ AFK disabled.',
    afkReply: (reason) => `💤 AFK: ${reason}`,
    afkAllServers: 'all servers',
    afkChannelOnly: 'this channel/DM only',
    afkOff: '✅ AFK disabled — you sent a message.',
    statusReset: '✅ Status reset.',
    autoReplayEnabled: (msg, count) => `✅ Auto-reply set: "${msg}" x${count} (DMs only)`,
    autoReplayDisabled: '✅ Auto-reply disabled.',
    spamUsage: '❌ Usage: !spam <message> <number_of_messages>',
    pong: (lat, ws) => `Pong! 🏓 Latency: **${lat}ms** | WebSocket: **${ws}ms**`,
  },
  ar: {
    help: `**📋 قائمة الأوامر:**
\`!playing <نص>\` — تعيين الحالة إلى "يلعب"
\`!watching <نص>\` — تعيين الحالة إلى "يشاهد"
\`!listening <نص>\` — تعيين الحالة إلى "يستمع"
\`!streaming <نص>\` — تعيين الحالة إلى "يبث"
\`!competing <نص>\` — تعيين الحالة إلى "ينافس"
\`!clear\` — مسح الحالة الحالية
\`!settime <النوع> <الحالة> <س.د>\` — تعيين حالة لمدة معينة ثم تُمسح تلقائياً (مثال: \`!settime playing Gaming 1.30\`)
\`!spam <رسالة> <عدد>\` — إرسال رسالة عدة مرات
\`!autoreplay <رسالة> <عدد>\` — الرد التلقائي على الرسائل الخاصة
\`!afk <السبب> <yes/no>\` — وضع AFK (yes = كل السيرفرات، no = القناة الحالية فقط)
\`!ping\` — فحص سرعة الاتصال
\`!language ar/en\` — تغيير اللغة إلى العربية أو الإنجليزية
\`!help\` — عرض هذه القائمة`,
    langSet: '✅ تم تغيير اللغة إلى **العربية**.',
    afkEnabled: (reason, scope) => `💤 تم تفعيل AFK: "${reason}" — ${scope}`,
    afkDisabled: '✅ تم إلغاء AFK.',
    afkReply: (reason) => `💤 AFK: ${reason}`,
    afkAllServers: 'كل السيرفرات',
    afkChannelOnly: 'هذه القناة فقط',
    afkOff: '✅ تم إلغاء AFK — لأنك أرسلت رسالة.',
    statusReset: '✅ تم مسح الحالة.',
    autoReplayEnabled: (msg, count) => `✅ تم تفعيل الرد التلقائي: "${msg}" × ${count} (الخاص فقط)`,
    autoReplayDisabled: '✅ تم إلغاء الرد التلقائي.',
    spamUsage: '❌ الاستخدام: !spam <رسالة> <عدد_الرسائل>',
    pong: (lat, ws) => `Pong! 🏓 زمن الاستجابة: **${lat}ms** | WebSocket: **${ws}ms**`,
  }
};

function startBot(token) {
  if (!token) return;

  const client = new Client();
  let statusTimer = null;
  let autoReplay = { active: false, message: '', remaining: 0 };
  let afk = { active: false, reason: '', allServers: false, channelId: null };
  let lang = 'en';

  const t = () => messages[lang];

  client.on('ready', () => {
    console.log(`[${client.user.tag}] Selfbot started! Prefix: ${prefix}`);
  });

  client.on('messageCreate', async message => {
    if (message.author.id === client.user.id) {
      if (afk.active && !message.content.startsWith(`${prefix}afk`)) {
        afk = { active: false, reason: '', allServers: false, channelId: null };
        await message.channel.send(t().afkOff).then(m => setTimeout(() => m.delete(), 3000));
      }

      const args = message.content.split(' ').slice(1);

      if (message.content.startsWith(`${prefix}help`)) {
        await message.delete();
        await message.channel.send(t().help);

      } else if (message.content.startsWith(`${prefix}language`)) {
        await message.delete();
        const chosen = args[0]?.toLowerCase();
        if (chosen === 'ar') {
          lang = 'ar';
          await message.channel.send(t().langSet);
        } else if (chosen === 'en') {
          lang = 'en';
          await message.channel.send(t().langSet);
        }

      } else if (message.content.startsWith(`${prefix}playing`)) {
        await message.delete();
        setStatus(client, 'playing', args.join(' '));

      } else if (message.content.startsWith(`${prefix}watching`)) {
        await message.delete();
        setStatus(client, 'watching', args.join(' '));

      } else if (message.content.startsWith(`${prefix}listening`)) {
        await message.delete();
        setStatus(client, 'listening', args.join(' '));

      } else if (message.content.startsWith(`${prefix}streaming`)) {
        await message.delete();
        setStatus(client, 'streaming', args.join(' '), 'https://www.twitch.tv/discord');

      } else if (message.content.startsWith(`${prefix}competing`)) {
        await message.delete();
        setStatus(client, 'competing', args.join(' '));

      } else if (message.content.startsWith(`${prefix}clear`)) {
        await message.delete();
        if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
        clearStatus(client);
        await message.channel.send(t().statusReset).then(m => setTimeout(() => m.delete(), 3000));

      } else if (message.content.startsWith(`${prefix}spam`)) {
        await message.delete();
        const parts = message.content.split(' ');
        const count = parseInt(parts[parts.length - 1]);
        if (isNaN(count) || count < 1) {
          return message.channel.send(t().spamUsage).then(m => setTimeout(() => m.delete(), 3000));
        }
        const spamText = parts.slice(1, parts.length - 1).join(' ');
        if (!spamText) return message.channel.send(t().spamUsage).then(m => setTimeout(() => m.delete(), 3000));
        for (let i = 0; i < count; i++) await message.channel.send(spamText);

      } else if (message.content.startsWith(`${prefix}settime`)) {
        await message.delete();
        const parts = message.content.split(' ');
        const lastPart = parts[parts.length - 1];
        const timeMatch = lastPart.match(/^(\d+)\.(\d+)$/);

        if (!timeMatch || parts.length < 4) {
          if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
          clearStatus(client);
          await message.channel.send(t().statusReset).then(m => setTimeout(() => m.delete(), 3000));
          return;
        }

        const actType = parts[1].toLowerCase();
        const validType = ACTIVITY_TYPES[actType] !== undefined ? actType : 'playing';
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const statusText = parts.slice(2, parts.length - 1).join(' ');
        const totalMs = (hours * 60 * 60 + minutes * 60) * 1000;

        if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
        setStatus(client, validType, statusText, validType === 'streaming' ? 'https://www.twitch.tv/discord' : undefined);

        statusTimer = setTimeout(() => {
          clearStatus(client);
          statusTimer = null;
        }, totalMs);

      } else if (message.content.startsWith(`${prefix}ping`)) {
        const sent = await message.channel.send('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(t().pong(latency, Math.round(client.ws.ping)));

      } else if (message.content.startsWith(`${prefix}autoreplay`)) {
        await message.delete();
        const parts = message.content.split(' ');
        const times = parseInt(parts[parts.length - 1]);

        if (isNaN(times) || times < 1 || parts.length < 3) {
          autoReplay = { active: false, message: '', remaining: 0 };
          await message.channel.send(t().autoReplayDisabled).then(m => setTimeout(() => m.delete(), 3000));
          return;
        }

        const replayMsg = parts.slice(1, parts.length - 1).join(' ');
        if (!replayMsg) {
          autoReplay = { active: false, message: '', remaining: 0 };
          return;
        }
        autoReplay = { active: true, message: replayMsg, remaining: times };
        await message.channel.send(t().autoReplayEnabled(replayMsg, times)).then(m => setTimeout(() => m.delete(), 3000));

      } else if (message.content.startsWith(`${prefix}afk`)) {
        await message.delete();
        const parts = message.content.split(' ');

        if (parts.length < 2) {
          afk = { active: false, reason: '', allServers: false, channelId: null };
          await message.channel.send(t().afkDisabled).then(m => setTimeout(() => m.delete(), 3000));
          return;
        }

        const scope = parts[parts.length - 1].toLowerCase();
        const isAllServers = scope === 'yes';
        const reason = parts.slice(1, parts.length - 1).join(' ');

        if (!reason) {
          afk = { active: false, reason: '', allServers: false, channelId: null };
          await message.channel.send(t().afkDisabled).then(m => setTimeout(() => m.delete(), 3000));
          return;
        }

        afk = { active: true, reason, allServers: isAllServers, channelId: isAllServers ? null : message.channel.id };
        const scopeLabel = isAllServers ? t().afkAllServers : t().afkChannelOnly;
        await message.channel.send(t().afkEnabled(reason, scopeLabel)).then(m => setTimeout(() => m.delete(), 4000));
      }

    } else {
      const mentionsMe = message.mentions.users.has(client.user.id);
      const inAfkChannel = afk.channelId && message.channel.id === afk.channelId;
      const isDM = message.channel.type === 'DM';

      if (afk.active) {
        if (afk.allServers && (mentionsMe || isDM)) {
          await message.reply(t().afkReply(afk.reason));
        } else if (!afk.allServers && (inAfkChannel || (isDM && message.channel.id === afk.channelId))) {
          await message.reply(t().afkReply(afk.reason));
        }
      }

      if (autoReplay.active && autoReplay.remaining > 0 && isDM) {
        await message.reply(autoReplay.message);
        autoReplay.remaining--;
        if (autoReplay.remaining === 0) autoReplay.active = false;
      }
    }
  });

  client.on('error', err => console.error(`[${token.slice(0, 8)}...] Error:`, err.message));
  client.login(token);
}

const tokens = [];
if (process.env.DISCORD_TOKEN)   tokens.push(process.env.DISCORD_TOKEN);
if (process.env.DISCORD_TOKEN_2) tokens.push(process.env.DISCORD_TOKEN_2);
if (process.env.DISCORD_TOKEN_3) tokens.push(process.env.DISCORD_TOKEN_3);
if (process.env.DISCORD_TOKEN_4) tokens.push(process.env.DISCORD_TOKEN_4);
if (process.env.DISCORD_TOKEN_5) tokens.push(process.env.DISCORD_TOKEN_5);

if (tokens.length === 0) {
  console.error('ERROR: No tokens set. Add DISCORD_TOKEN in the Secrets tab.');
  process.exit(1);
}

console.log(`Starting ${tokens.length} account(s)...`);
tokens.forEach((token, i) => {
  console.log(`Launching account ${i + 1}...`);
  startBot(token);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err ? err.message : err);
});
