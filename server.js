/**
 * =========================================================================
 * ★ VGEN AI TERMINAL (ULTIMATE FULL EDITION - PATCHED) ★
 * =========================================================================
 * Arsitektur cerdas untuk efisiensi dan analisis.
 * Pemilik otoritas absolut: Vicky.
 * MESIN TELAH DI-UPGRADE KE BAILEYS (NATIVE FLOW BUTTON AKTIF)
 * =========================================================================
*/


const express = require('express');
const cors = require('cors');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));


// 🚀 MESIN BARU: BAILEYS MURNI (Pengganti whatsapp-web.js)
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    generateWAMessageFromContent, 
    downloadContentFromMessage,
    proto 
} = require('@whiskeysockets/baileys');

// Pastikan file prompt.js ada di folder yang sama
let vgenPrompt = "";
try { vgenPrompt = require('./prompt.js'); } catch (e) { vgenPrompt = "Kamu adalah VGen AI."; }

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================================
// 🎨 SISTEM WARNA TERMINAL - HIGHLY PROFESSIONAL (NO HACKER THEME)
// =========================================================================
const c = {
    g: '\x1b[34m', // Professional Blue
    r: '\x1b[31m', // Red
    y: '\x1b[33m', // Yellow
    c: '\x1b[36m', // Cyan
    w: '\x1b[37m', // Clean White
    rst: '\x1b[0m' // Reset
};

function logInfo(msg) { console.log(`${c.g}[INFO] ${msg}${c.rst}`); }
function logWarn(msg) { console.log(`${c.y}[WARN] ${msg}${c.rst}`); }
function logErr(msg) { console.log(`${c.r}[ERROR] ${msg}${c.rst}`); }
function logSys(msg) { console.log(`${c.c}[SYSTEM] ${msg}${c.rst}`); }

// =========================================================================
// 🗄️ SISTEM DATABASE PERSISTEN (JSON) & VARIABEL GLOBAL 
// =========================================================================
const dbFile = './database.json';
const hardBannedList = ["6289647369075","6289666046050","6289653405715","6289656337825","6282295187265","6282125254158","6288210392590","62895393706910","6285129449240","6285813943453","6285777604598","62895338858682","6285775230869","6285894444173","6285282593465","62895416002767","62895402208265","6281632100058","6289501502983","622127937262","622150857500","1500445","6285133485801","6285811073595","6288214101299","6287794963956","6282355156336","6289501982464","62895322501138","6289673685859","62895391790601","6281389354063","6289509781250","6287785837479","62895338097405","62895322540794","6285213533313","6289636432550","6289674003035","6281315557530","6289601970928","62895424040084","6287750310823","628972120517","6285218244039","6288809228876","6281315512649","6281387418241","628990464427","62895338155978","6285211594349","6282188608886","6285782046317","6288808940313","6282121012045","6281285036404","6281540090423","6285700581284"];
const listGames = ['.vasahotak', '.vkuis', '.vtebaklagu', '.vtebakkata', '.vsusunkata', '.vtebakkode', '.vsiapakahaku', '.vtebakbendera', '.vtebakfilm', '.vtebakhewan', '.vtebakangka', '.vtebaktokoh', '.vtebakibukota'];
const INITIAL_LIMIT = 5;

let db = {
    owners: ["62895410975149"], 
    vips: ["6289668591566", "6281292729210"], 
    premiums: [],
    limits: {},
    logs: {}, 
    banned: hardBannedList
};

if (fs.existsSync(dbFile)) {
    try { 
        let localDb = JSON.parse(fs.readFileSync(dbFile)); 
        db = { ...localDb, banned: [...new Set([...(localDb.banned || []), ...hardBannedList])] };
        if (db.apiConfig) {
            activeApiKey = db.apiConfig.apiKey;
            activeProvider = db.apiConfig.provider ? db.apiConfig.provider.toUpperCase() : null;
            activeModel = db.apiConfig.model;
        }
        
    } catch (e) { logErr("Gagal membaca database."); }
}

function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

let activeProvider = null; let activeApiKey = null; let activeModel = null; let isAiMuted = false; 
let isOwnerVerified = false;
let isAutoRead = false;
let verifiedActTime = "Belum pernah diaktifkan"; 
const mutedTargets = new Set(); const userCooldowns = new Map(); const activeGames = new Map(); 
const votedPolls = new Set(); 

// 🛡️ LOGIKA LIMIT KETAT 
function getLimitDetail(userId, isOwner, isVip, isPremium) {
    if (isOwner) return '∞'; 
    if (db.limits[userId] === undefined) { 
        db.limits[userId] = isPremium ? 50 : (isVip ? 10 : INITIAL_LIMIT); 
        saveDb(); 
    }
    return db.limits[userId];
}

function deductLimit(userId, isOwner) {
    if (isOwner) return true;
    let current = db.limits[userId] || 0;
    if (current <= 0) return false;
    db.limits[userId] -= 1;
    saveDb();
    return true;
}

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'audio/mp4', 'audio/ogg'];

const labelGaul = [
    "> _Sistem pusat udah nge-acc permintaan lu ._\u200B",
    "> _Server VGen ngerespon dengan kecepatan cahaya, murni tanpa halusinasi._\u200B",
    "> _Terkoneksi langsung ke inti matriks VGen AI._\u200B",
    "> _Semua data diproses di bawah otoritas tertinggi VGen._\u200B",
    "> _Engine AI kelar ngerjain tugas lu. Aman terkendali._\u200B",
    "> _Otorisasi sukses. Matriks data berhasil diekstrak sama sistem._\u200B",
    "> _Dieksekusi langsung dari command center VGen by Vicky._\u200B"
];
function getLabel() { return labelGaul[Math.floor(Math.random() * labelGaul.length)]; }

function formatTime() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}
function formatTglWaktu() { return new Date().toLocaleString('id-ID'); }

function getLimit(userId, isOwner, isVip) {
    if (isOwner) return '∞'; 
    if (db.limits[userId] === undefined) { db.limits[userId] = INITIAL_LIMIT; saveDb(); }
    return db.limits[userId];
}

function recordLog(userId, action) {
    db.logs[userId] = action;
    saveDb();
}
const delay = ms => new Promise(res => setTimeout(res, ms));

async function vgenLoading(sock, jid, textInfo) {
    try {
        await sock.sendMessage(jid, { text: `⏳ ${textInfo}\u200B` });
    } catch (e) {}
}

async function fetchSosmedData(platform, username) {
    let un = username.replace(/\s+/g, '').replace('@', '').toLowerCase();
    let url = '';
    const sosmedMap = {
        'youtube': `[https://www.youtube.com/@$](https://www.youtube.com/@$){un}`,
        'tiktok': `[https://www.tiktok.com/@$](https://www.tiktok.com/@$){un}`,
        'instagram': `[https://www.instagram.com/$](https://www.instagram.com/$){un}/`,
        'facebook': `[https://www.facebook.com/$](https://www.facebook.com/$){un}`,
        'twitter': `[https://twitter.com/$](https://twitter.com/$){un}`,
        'linkedin': `[https://www.linkedin.com/in/$](https://www.linkedin.com/in/$){un}/`,
        'pinterest': `[https://id.pinterest.com/$](https://id.pinterest.com/$){un}/`,
        'twitch': `[https://www.twitch.tv/$](https://www.twitch.tv/$){un}`,
        'spotify': `[https://open.spotify.com/user/$](https://open.spotify.com/user/$){un}`,
        'github': `[https://github.com/$](https://github.com/$){un}`,
        'reddit': `[https://www.reddit.com/user/$](https://www.reddit.com/user/$){un}`,
        'discord': `[https://discord.com/users/$](https://discord.com/users/$){un}`,
        'telegram': `[https://t.me/$](https://t.me/$){un}`,
        'line': `[https://line.me/R/ti/p/~$](https://line.me/R/ti/p/~$){un}`,
        'snapchat': `[https://www.snapchat.com/add/$](https://www.snapchat.com/add/$){un}`,
        'threads': `[https://www.threads.net/@$](https://www.threads.net/@$){un}`
    };
    
    url = sosmedMap[platform] || `https://www.${platform}.com/@${un}`;
    
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        if (!res.ok) return { status: false, url: url, image: null, title: un, desc: 'Akun tidak ditemukan atau link sudah mati (Zonk).' };
        const html = await res.text();
        const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
        const ogTitleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
        const ogDescMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i);
        
        return {
            status: true,
            url: url,
            image: ogImageMatch ? ogImageMatch[1] : null,
            title: ogTitleMatch ? ogTitleMatch[1] : un,
            desc: ogDescMatch ? ogDescMatch[1] : 'Tidak ada bio/deskripsi yang terdeteksi.'
        };
    } catch (e) {
        return { status: false, url: url, image: null, title: un, desc: 'Sistem diblokir oleh platform atau koneksi error.' };
    }
}

async function downloadMediaBaileys(message, type) {
    try {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) { return null; }
}

// =========================================================================
// 🚀 INISIALISASI ENGINE WHATSAPP BAILEYS
// =========================================================================
let sock; // Global socket

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('vgen_session');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        // 🔥 FIX 1: BROWSER MAC OS MURNI BIAR KEBACA SEBAGAI MAC (NO CHROME)
        browser: ['VGen AI Ultimate', 'Mac OS', 'Safari', '14.6.7']
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update; 
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
                } else if (connection === 'open') {
            // 🔥 TEMA REVAMP: RGB GAMING EDITION 🔥
            const r1 = '\x1b[38;5;196m'; // Red
            const r2 = '\x1b[38;5;208m'; // Orange
            const r3 = '\x1b[38;5;226m'; // Yellow
            const r4 = '\x1b[38;5;46m';  // Green
            const r5 = '\x1b[38;5;51m';  // Cyan
            const r6 = '\x1b[38;5;21m';  // Blue
            const r7 = '\x1b[38;5;201m'; // Magenta
            const w  = '\x1b[1m\x1b[37m'; // Bold White
            const rst = '\x1b[0m';
            
            const giantBanner = `
${r1}██╗   ██╗${r2} ██████╗ ${r3}███████╗${r4}███╗   ██╗${r5} █████╗ ${r6}██╗
${r2}██║   ██║${r3}██╔════╝ ${r4}██╔════╝${r5}████╗  ██║${r6}██╔══██╗${r7}██║
${r3}██║   ██║${r4}██║  ███╗${r5}█████╗  ${r6}██╔██╗ ██║${r7}███████║${r1}██║
${r4}╚██╗ ██╔╝${r5}██║   ██║${r6}██╔══╝  ${r7}██║╚██╗██║${r1}██╔══██║${r2}██║
${r5} ╚████╔╝ ${r6}╚██████╔╝${r7}███████╗${r1}██║ ╚████║${r2}██║  ██║${r3}██║
${r6}  ╚═══╝  ${r7} ╚═════╝ ${r1}╚══════╝${r2}╚═╝  ╚═══╝${r3}╚═╝  ╚═╝${r4}╚═╝${rst}
            `;
            console.log(`\n${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${rst}`);
            console.log(giantBanner);
            console.log(`${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${r1}=${r2}=${r3}=${r4}=${r5}=${r6}=${r7}=${rst}`);
            console.log(`\x1b[48;5;16m${w} 🚀 [ VGEN AI ULTIMATE] AI REVOLUTION ACTIVE✅ \x1b[0m`);
            console.log(`${w} 👤 Developer: VickyyVall | Mesin Siap Tempur 24/7 ${rst}`);
            console.log(`${r7}=${r6}=${r5}=${r4}=${r3}=${r2}=${r1}=${r7}=${r6}=${r5}=${r4}=${r3}=${r2}=${r1}=${r7}=${r6}=${r5}=${r4}=${r3}=${r2}=${r1}=${rst}\n`);
        }

    });

    // =========================================================================
    // 🧠 CORE ROUTER & RIWAYAT TERMINAL (BAILEYS EDITION)
    // =========================================================================
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const now = new Date();
        const jam = now.toLocaleTimeString('id-ID');
        const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        if (isGroup) return; // Ignore Group
        if (from === 'status@broadcast') return; // Ignore Status

        let senderJid = msg.key.fromMe ? sock.user.id : (msg.key.participant || from);
        let pengirimRaw = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        let penerimaRaw = sock.user.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

        if (msg.key.fromMe || pengirimRaw.startsWith('258')) pengirimRaw = db.owners[0];

        // Ekstraksi Tipe Pesan Baileys
        const type = Object.keys(msg.message)[0];
        let pesanTeks = '';
        let hasMedia = false;
        let mediaType = '';
        
        if (type === 'conversation') { pesanTeks = msg.message.conversation; } 
        else if (type === 'extendedTextMessage') { pesanTeks = msg.message.extendedTextMessage.text; }
        else if (type === 'imageMessage') { pesanTeks = msg.message.imageMessage.caption || ''; hasMedia = true; mediaType = 'image'; }
        else if (type === 'videoMessage') { pesanTeks = msg.message.videoMessage.caption || ''; hasMedia = true; mediaType = 'video'; }
        else if (type === 'interactiveResponseMessage') {
            const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            pesanTeks = params.id;
        }

        const isCmd = pesanTeks.startsWith('!') || pesanTeks.startsWith('.');
        const bodyTrimmed = pesanTeks.toLowerCase().trim();

        // 🔥 FITUR AUTO-READ BACA PESAN
        if (isAutoRead && !msg.key.fromMe) {
            await sock.readMessages([msg.key]);
        }
        // 🔥 FIX 2: JEBOL BLOCKER DIRI SENDIRI KALO LAGI MODE VERIFIED!
        if (msg.key.fromMe && !isCmd && !bodyTrimmed.includes('vgen') && !isOwnerVerified) return;

        const myNumber = sock.user.id.split(':')[0];
        const isOwner = db.owners.includes(pengirimRaw) || msg.key.fromMe || pengirimRaw === myNumber; 
        const isPremium = db.premiums ? db.premiums.includes(pengirimRaw) : false;
        const isVIP = db.vips ? db.vips.includes(pengirimRaw) : false;

        // Anti View Once
        if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
            try {
                const voType = Object.keys(msg.message[type].message)[0];
                const buffer = await downloadMediaBaileys(msg.message[type].message[voType], voType === 'imageMessage' ? 'image' : 'video');
                if (buffer) {
                    await sock.sendMessage(`${db.owners[0]}@s.whatsapp.net`, { 
                        [voType === 'imageMessage' ? 'image' : 'video']: buffer, 
                        caption: `📸 *ANTI VIEW-ONCE DARI:* ${pengirimRaw}\n\n> _Sistem berhasil menjebol foto/video sekali lihat secara utuh._\u200B` 
                    });
                }
            } catch (err) { logErr("Gagal membongkar View-Once"); }
        }

        if (!pesanTeks.includes('\u200B')) {
            logSys(`\n==================================================`);
            logInfo(` 📩 [ RIWAYAT PESAN ] - ${tanggal} | Jam: ${jam}`);
            logInfo(` 👤 Pengirim : ${msg.key.fromMe ? 'Vicky (Outgoing/Self)' : pengirimRaw}`);
            logInfo(` 🎯 Tujuan   : ${penerimaRaw}`);
            logInfo(` 📄 Tipe     : ${type}`);
            console.log(`${c.w} 💬 Isi      : ${pesanTeks ? pesanTeks.substring(0, 70).replace(/\n/g, ' ') + '...' : '(Media/Button)'}${c.rst}`);
            logSys(`==================================================`);
        }

        if (pesanTeks.includes('\u200B')) return; 
        if (typeof isAiMuted !== 'undefined' && isAiMuted && bodyTrimmed !== '.unmute') return;
        if (typeof mutedTargets !== 'undefined' && mutedTargets.has(from)) return;
        if (db.banned.includes(pengirimRaw) && !isOwner) {
            logErr(` 🚫 [SISTEM] Akses ditolak secara permanen untuk ${pengirimRaw}.`);
            return;
        }

                // =========================================================================
        // ✅ SISTEM REPLY (NORMAL & VERIFIED DIPISAH TOTAL)
        // =========================================================================    
        const getDynamicStatusQuote = (teksKutipan) => {
            return {
                key: { 
                    fromMe: false, 
                    participant: '0@s.whatsapp.net',
                    remoteJid: 'status@broadcast', 
                    id: 'WhatsApp' 
                },
                message: { 
                    extendedTextMessage: { 
                        text: teksKutipan || '\u200B' 
                    } 
                } 
            };
        };
        
        const verifiedReply = async (text) => {
            // KHUSUS VERIFIED: Pake trik status@broadcast
            const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                               msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                               pesanTeks;
            return await sock.sendMessage(from, { text: text }, { 
                quoted: getDynamicStatusQuote(quotedText)
            });
        };
        
        const reply = async (text) => {
            // NORMAL REPLY: Cuma nge-quote pesan asli dari temen lu (Gak pake verified!)
            return await sock.sendMessage(from, { 
                text: text, 
                mentions: [`${pengirimRaw}@s.whatsapp.net`] 
            }, { quoted: msg });
        };

        
        // =========================================================================
        // 🗑️ MANIPULASI HAPUS PESAN
        // =========================================================================
        if (bodyTrimmed === '.deletemsg') {
            if (!isOwner) return reply("⚠️ Akses ditolak: Lu bukan Raja. Cuma Owner/Developer yang bisa narik pesan.\u200B");
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const stanzaId = msg.message.extendedTextMessage.contextInfo.stanzaId;
                const participant = msg.message.extendedTextMessage.contextInfo.participant || from;
                await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: participant === sock.user.id, id: stanzaId, participant: participant }});
            } else {
                reply("⚠️ Reply pesan yang mau dihapus, lalu ketik .deletemsg\u200B");
            }
            return;
        }

        // =========================================================================
        // 👑 KONTROL VVIP LENGKAP & 5 PENOLAKAN KETAT
        // =========================================================================
        const ownerCommands = ['.addowner', '.delowner', '.addvip', '.delvip', '.addpremium', '.delpremium', '.mute', '.unmute', '.banned', '.unbanned', '.vaddlimit', '.listvip', '.listpremium', '.listbanned', '.vgenverified', '.unverified'];
        const isOwnerCommand = ownerCommands.some(cmd => bodyTrimmed.startsWith(cmd));
        
        if (isOwnerCommand && !isOwner) {
            const penolakan = [
                "Fitur ini khusus untuk owner.\u200B",
                "Hanya owner yang bisa akses fitur ini.\u200B",
                "Akses ditolak, fitur ini khusus owner.\u200B",
                "Maaf, fitur ini hanya untuk owner.\u200B",
                "Lu bukan owner, gak bisa pakai fitur ini.\u200B"
            ];
            const teksTolak = penolakan[Math.floor(Math.random() * penolakan.length)];
            return reply(teksTolak); 
        }

        let isAiFeature = false; let finalPrompt = ""; let base64Media = null; let mimeTypeMedia = null; 
        let fiturName = "Respon Kognitif AI"; let footerTextAi = getLabel();
        let isNaturalChat = false;

                if (isOwner) {
            const numTarget = pesanTeks.split(' ')[1] ? pesanTeks.split(' ')[1].replace(/[^0-9]/g, '') : '';
            const cleanTarget = numTarget.startsWith('0') ? '62' + numTarget.substring(1) : numTarget;

            if (bodyTrimmed.startsWith('.addowner ')) {
                if (!db.owners.includes(cleanTarget)) { db.owners.push(cleanTarget); saveDb(); }
                return reply(`User @${cleanTarget} sukses ditetapkan sebagai Owner+Developer.\u200B`);
            }
            if (bodyTrimmed.startsWith('.delowner ')) {
                db.owners = db.owners.filter(v => v !== cleanTarget); saveDb();
                return reply(`User @${cleanTarget} dihapus dari daftar Owner+Developer.\u200B`);
            }
            if (bodyTrimmed.startsWith('.addvip ')) {
                if (!db.vips.includes(cleanTarget)) { db.vips.push(cleanTarget); saveDb(); }
                return reply(`User @${cleanTarget} sukses menjadi VIP.\u200B`);
            }
            if (bodyTrimmed.startsWith('.delvip ')) {
                db.vips = db.vips.filter(v => v !== cleanTarget); saveDb();
                return reply(`User @${cleanTarget} dihapus dari VIP.\u200B`);
            }
            if (bodyTrimmed.startsWith('.addpremium ')) {
                if (!db.premiums.includes(cleanTarget)) { db.premiums.push(cleanTarget); saveDb(); }
                return reply(`User @${cleanTarget} sukses masuk daftar Premium.\u200B`);
            }
            if (bodyTrimmed.startsWith('.delpremium ')) {
                db.premiums = db.premiums.filter(v => v !== cleanTarget); saveDb();
                return reply(`User @${cleanTarget} dihapus dari Premium.\u200B`);
            }
            if (bodyTrimmed.startsWith('.banned ')) {
                if (!db.banned.includes(cleanTarget)) { db.banned.push(cleanTarget); saveDb(); }
                return reply(`User @${cleanTarget} telah di-banned permanen dari sistem.\u200B`);
            }
            if (bodyTrimmed.startsWith('.unbanned ')) {
                db.banned = db.banned.filter(v => v !== cleanTarget); saveDb();
                return reply(`User @${cleanTarget} berhasil di-unbanned.\u200B`);
            }
            if (bodyTrimmed === '.mute') { isAiMuted = true; return reply(`Respon AI telah dinonaktifkan.\u200B`); }
            if (bodyTrimmed === '.unmute') { isAiMuted = false; return reply(`Respon AI telah diaktifkan kembali.\u200B`); }
            
            if (bodyTrimmed === '.autoread') {
                isAutoRead = true; 
                return reply(`Auto read telah diaktifkan.\u200B`);
            }
            if (bodyTrimmed === '.unautoread') {
                isAutoRead = false; 
                return reply(`Auto read telah dinonaktifkan.\u200B`);
            }           
            if (bodyTrimmed === '.vgenverified') { 
                isOwnerVerified = true; 
                verifiedActTime = formatTglWaktu();
                const strictMsg = `VERIFIED WHATSAPP\n\nStatus: ACTIVE\nFeature: VGenVerified (Status Broadcast Override)\nTimestamp: ${verifiedActTime}\n\nSeluruh balasan sistem saat ini dikonfigurasi ulang untuk menggunakan entitas 'VGen AI'. Mode ini aktif secara global hingga dinonaktifkan.\u200B`;
                return verifiedReply(strictMsg); 
            }
            if (bodyTrimmed === '.unverified') { 
                isOwnerVerified = false; 
                const strictMsg = `SYSTEM NOTIFICATION\n\nStatus: INACTIVE\nFeature: VGenVerified\nLast Active: ${verifiedActTime}\n\nSistem balasan telah dikembalikan ke mode normal.\u200B`;
                return sock.sendMessage(from, { text: strictMsg }, { quoted: msg }); 
            }

            if (bodyTrimmed === '.listvip') {
                let res = "*DAFTAR VIP:*\n\n";
                db.vips.forEach((v, i) => res += `${i+1}. ${v}\n`);
                return reply(db.vips.length ? res : "Daftar VIP kosong.\u200B");
            }
            if (bodyTrimmed === '.listpremium') {
                if (!db.premiums || db.premiums.length === 0) {
                    isAiFeature = true;
                    fiturName = "Deklarasi Sistem Kosong";
                    finalPrompt = "Jelaskan dengan gaya tongkrongan dan panjang lebar bahwa daftar premium VGen AI saat ini kosong. Sebutin fitur gila premium (kayak buat musik, akses elit) dan suruh mereka join lewat Owner. Jelasin detail, point by point. (DILARANG PAKAI EMOJI ALAY, WAJIB KERJA BARENG AI DAN MANUSIA).";
                } else {
                    let res = "*DAFTAR PREMIUM VGEN:*\n\n";
                    db.premiums.forEach((v, i) => res += `${i+1}. ${v}\n`);
                    return reply(`${res}\u200B`);
                }
            }
            if (bodyTrimmed === '.listbanned') {
                let res = "*DAFTAR BANNED:*\n\n";
                db.banned.forEach((v, i) => res += `${i+1}. ${v}\n`);
                return reply(db.banned.length ? res : "Daftar Banned kosong.\u200B");
            }
            if (bodyTrimmed.startsWith('.vaddlimit')) {
                const parts = pesanTeks.split(' ');
                if (parts.length < 3) {
                    isAiFeature = true;
                    fiturName = "Instruksi Command";
                    finalPrompt = "Jelaskan dengan gaya tongkrongan bahwa orang ini kurang masukin argumen buat command .vaddlimit. Jelasin cara pakenya: .vaddlimit [jumlah] [nomor] biar nambah limitnya. Jangan pake emoji alay.";
                } else {
                    const jumlah = parseInt(parts[1]);
                    if (isNaN(jumlah)) return reply(`*GAGAL:*\nJumlah harus berupa angka.\u200B`);
                    let finalTarget = parts.slice(2).join(' ').replace(/[^0-9]/g, '');
                    if (finalTarget.startsWith('0')) finalTarget = '62' + finalTarget.substring(1);
                    
                    if (db.owners.includes(finalTarget)) return reply(`Limit @${finalTarget} adalah tak terbatas. Status: Owner+Developer.\u200B`);
                    
                    if (db.limits[finalTarget] === undefined) db.limits[finalTarget] = INITIAL_LIMIT; 
                    db.limits[finalTarget] += jumlah; saveDb();
                    return reply(`Limit @${finalTarget} berhasil ditambahkan. Total sekarang: ${db.limits[finalTarget]}\u200B`);
                }
            }
        }


        // =========================================================================
        // 🌟 FITUR UTAMA: NATIVE FLOW BUTTON MENU - CYBER EXECUTIVE UI
        // =========================================================================
        if (['!vgen', '.vgen', '! vgen'].includes(bodyTrimmed)) {
            const limitSisa = getLimit(pengirimRaw, isOwner, isVIP);
            
            // Varian Tabel: Cyber Executive (Simbol Penunjuk Elegan & Sudut Tumpul 100%)
            let menuBase = `╭─ ⎔ 𝐕𝐆𝐄𝐍 𝐀𝐈 𝐔𝐋𝐓𝐈𝐌𝐀𝐓𝐄\n`;
            menuBase += `│\n`;
            menuBase += `├─ ❯ 𝗦𝗧𝗔𝗧𝗨𝗦 𝗣𝗘𝗡𝗚𝗚𝗨𝗡𝗔\n`;
            menuBase += `│  👤 Pengguna: ${isOwner ? '🜲 Developer' : (isPremium ? 'Premium' : (isVIP ? 'VIP' : 'Pengguna Reguler'))}\n`;
            menuBase += `│  ⏳ Limit Tersedia: ${limitSisa}\n`;
            menuBase += `│\n`;
            
            if (isOwner) {
                menuBase += `├─ ❯ 𝗢𝗪𝗡𝗘𝗥 𝗔𝗖𝗖𝗘𝗦𝗦\n`;
                menuBase += `│➢ .addowner / .delowner\n`;
                menuBase += `│➢ .addvip / .delvip\n`;
                menuBase += `│➢ .addpremium / .delpremium\n`;
                menuBase += `│➢ .vaddlimit [jml] [no]\n`;
                menuBase += `│➢ .banned / .unbanned\n`;
                menuBase += `│➢ .mute / .unmute\n`;
                menuBase += `│➢ .listvip / .listpremium\n`;
                menuBase += `│➢ .listbanned\n`;
                menuBase += `│➢ .deletemsg (Reply)\n`;
                menuBase += `│➢ .vgenverified *(On)*\n`;
                menuBase += `│➢ .unverified *(Off)*\n`;
                menuBase += `│➢ .autoread\n`;
                menuBase += `│➢ .unautoread\n`;
                menuBase += `│\n`;
            }

            menuBase += `├─ ❯ 𝗔𝗜 & 𝗕𝗔𝗛𝗔𝗦𝗔\n`;
            menuBase += `│➢ .vkalkulatorcinta *[nm1] & [nm2]*\n`;
            menuBase += `│➢ .vkalkulator *[soal]*\n`;
            menuBase += `│➢ .vrangkumteks *[teks]*\n`;
            menuBase += `│➢ .vperbaikikata *[teks]*\n`;
            menuBase += `│\n`;      
            
            menuBase += `├─ ❯ 𝗠𝗘𝗗𝗜𝗔 & 𝗞𝗥𝗘𝗔𝗦𝗜\n`;
            menuBase += `│➢ .buatgambar *[deskripsi]*\n`;
            menuBase += `│➢ .searchimage *[kata kunci]*\n`;
            menuBase += `│➢ .pinsearch *[keyword]*\n`;
            menuBase += `│➢ .audio *[judul lagu]*\n`;
            menuBase += `│➢ .buatmusik *[genre]* *_(Prem)_*\n`;
            menuBase += `│\n`;

            menuBase += `├─ ❯ 𝗣𝗘𝗥𝗠𝗔𝗜𝗡𝗔𝗡\n`;
            menuBase += `│➢ .vasahotak [+3 limit]\n`;
            menuBase += `│➢ .vkuis [+2 limit]\n`;
            menuBase += `│➢ .vtebaklagu [+3 limit]\n`;
            menuBase += `│➢ .vtebakkata [+2 limit]\n`;
            menuBase += `│➢ .vsusunkata [+4 limit]\n`;
            menuBase += `│➢ .vtebakkode [+5 limit]\n`;
            menuBase += `│➢ .vsiapakahaku [+3 limit]\n`;
            menuBase += `│➢ .vtebakbendera [+2 limit]\n`;
            menuBase += `│➢ .vtebakfilm [+4 limit]\n`;
            menuBase += `│➢ .vtebakhewan [+2 limit]\n`;
            menuBase += `│➢ .vtebakangka [+4 limit]\n`;
            menuBase += `│➢ .vtebaktokoh [+3 limit]\n`;
            menuBase += `│➢ .vtebakibukota [+2 limit]\n`;
            menuBase += `│➢ .vtebakgambar [+2 limit]\n`;
            menuBase += `│➢ .matematika [+1 s/d +30]\n`;
            menuBase += `│\n`;

            menuBase += `├─ ❯ 𝗦𝗢𝗦𝗜𝗔𝗟 𝗠𝗘𝗗𝗜𝗔\n`;
            menuBase += `│➢ .youtube @username\n`;
            menuBase += `│➢ .tiktok @username\n`;
            menuBase += `│➢ .instagram @username\n`;
            menuBase += `│➢ .facebook @username\n`;
            menuBase += `│➢ .twitter @username\n`;
            menuBase += `│➢ .linkedin @username\n`;
            menuBase += `│➢ .pinterest @username\n`;
            menuBase += `│➢ .twitch @username\n`;
            menuBase += `│➢ .spotify @username\n`;
            menuBase += `│➢ .github @username\n`;
            menuBase += `│➢ .reddit @username\n`;
            menuBase += `│➢ .discord @username\n`;
            menuBase += `│➢ .telegram @username\n`;
            menuBase += `│➢ .line @username\n`;
            menuBase += `│➢ .snapchat @username\n`;
            menuBase += `│➢ .threads @username\n`;
            menuBase += `│\n`;

            menuBase += `├─ ❯ 𝗞𝗘𝗟𝗢𝗟𝗔 𝗦𝗜𝗦𝗧𝗘𝗠\n`;
            menuBase += `│➢ .vceklimit (atau [62xxx])\n`;
            menuBase += `╰────────────────────\n\n`;

            menuBase += getLabel();

            let msgContent = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                           contextInfo: { 
                               stanzaId: msg.key.id, 
                                participant: msg.key.fromMe ? sock.user.id : (msg.key.participant || from), 
                                quotedMessage: msg.message 
                            },
                            body: proto.Message.InteractiveMessage.Body.create({ text: menuBase }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "© VGen AI (Revolution AI)" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "⎔ DASHBOARD UTAMA", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "single_select", 
                                        buttonParamsJson: JSON.stringify({
                                            title: "☰ Menu Navigasi",
                                            sections: [{
                                                title: "Opsi Sistem",
                                                rows: [
                                                    { header: "", title: "Cek Limit Kredensi", id: ".vceklimit" },
                                                    { header: "", title: "Tebak Gambar AI", id: ".vtebakgambar" }
                                                ]
                                            }]
                                        })
                                    },
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({ display_text: "Kunjungi Portal VGen", url: "https://bisnisproject.com", merchant_url: "https://bisnisproject.com" })
                                    }
                                ]
                            })
                        })
                    }
                }
            }, { userJid: sock.user.id });

            return await sock.relayMessage(from, msgContent.message, { messageId: msgContent.key.id });
        }

        if (!isOwner && !isVIP && !isPremium && !isCmd) return;       
        await sock.sendPresenceUpdate('composing', from);

        if (isCmd && !bodyTrimmed.startsWith('.vceklimit') && !isOwnerCommand) {
            if (!deductLimit(pengirimRaw, isOwner)) {
                return reply(`❌ *LIMIT LU HABIS !*\nSilakan minta Suntik limit ke Owner atau Top Up.\u200B`);
            }
        }

        // =========================================================================
        // 📊 CEK LIMIT
        // =========================================================================
        if (bodyTrimmed.startsWith('.vceklimit')) {
            await vgenLoading(sock, from, "Loading...");
            let targetRaw = pengirimRaw;
            const parts = pesanTeks.split(' ');
            if (parts.length > 1) {
                targetRaw = parts[1].replace(/[^0-9]/g, '');
                if (targetRaw.startsWith('0')) targetRaw = '62' + targetRaw.substring(1);
            }

            const isTgtOwner = db.owners.includes(targetRaw);
            
            if (isTgtOwner) {
                isAiFeature = true; fiturName = "Deklarasi Otoritas Absolut";
                finalPrompt = `Sistem sedang mengecek status user dengan nomor ${targetRaw}. Tuliskan STATUS RESMI panjang lebar, jelaskan bahwa dia adalah DEVELOPER TINGKAT TINGGI, RAJA DARI SEGALA RAJA, PENGUASA VGEN AI. Jelaskan bahwa hierarkinya: Owner > Premium > VIP > Biasa. Dia tidak perlu nambahin dirinya ke Premium/VIP, dan limitnya adalah simbol tak terhingga (∞). Dia punya HAK AKSES MUTLAK ke semua fitur ketat. (JANGAN BALA EMOJI).`;
            } else {
                const isTgtPremium = db.premiums ? db.premiums.includes(targetRaw) : false;
                const isTgtVip = db.vips.includes(targetRaw);
                const limitSisa = getLimitDetail(targetRaw, isTgtOwner, isTgtVip, isTgtPremium);
                const logAksi = db.logs[targetRaw] || "Belum ada rekam jejak aktifitas.";
                const statusOtoritas = isTgtPremium ? "🌟 Premium" : (isTgtVip ? "💎 VIP" : "Pengguna Reguler");

                return reply(`✅ *CEK LIMIT*\n\n👤 *User:* ${targetRaw}\n🛡️ *Kasta:* ${statusOtoritas}\n⭕ *Sisa Limit:* ${limitSisa}\n\n📝 *Aktivitas Terakhir:*\n${logAksi}\n\n${getLabel()}`);
            }
        }

        // =========================================================================
        // ✅ SISTEM CEK JAWABAN ALL GAMES
        // =========================================================================
        if (activeGames.has(from) && !bodyTrimmed.startsWith('.') && !bodyTrimmed.startsWith('!')) {
            const game = activeGames.get(from);
            if (bodyTrimmed === 'nyerah' || bodyTrimmed === 'batal') {
                clearTimeout(game.timeoutId); activeGames.delete(from);
                return reply(`Sesi game dibatalkan.\u200B`);
            }
            if (bodyTrimmed.includes(game.answer) || game.answer.includes(bodyTrimmed)) {
                clearTimeout(game.timeoutId); activeGames.delete(from);
                if (!isOwner) {
                    if (db.limits[pengirimRaw] === undefined) db.limits[pengirimRaw] = INITIAL_LIMIT;
                    db.limits[pengirimRaw] += game.reward; saveDb();
                }
                const txtReward = isOwner ? "Dewa ga butuh limit!" : `🎁 Limit lu nambah +${game.reward}. Sisa: ${db.limits[pengirimRaw]}`;
                return reply(`✅ *BENER BANGET!*\nJawaban: *${game.answer.toUpperCase()}*\n\n${txtReward}\n\nMain lagi? Ketik command gamenya !\u200B`);
            }
        }
 
     // =========================================================================
     // 🌟 HELPER BUTTON GAME OVER (KALAH / WAKTU HABIS)
     // =========================================================================
        const sendGameEndButtons = async (jid, textPesan, cmdMainLagi) => {
        const directButtons = [
        { 
            name: 'quick_reply', 
            buttonParamsJson: JSON.stringify({ display_text: '🔄 Main Lagi', id: cmdMainLagi }) 
        },
        { 
            name: 'quick_reply', 
            buttonParamsJson: JSON.stringify({ display_text: '🏳️ Nyerah', id: '.vgen' }) 
        }
    ];
    
    const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: textPesan }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: "Tekan tombol di bawah untuk respon instan." }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ 
            buttons: directButtons 
        })
    });
    
    const msgContent = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: interactiveMessage
            }
        }
    }, {});
    
    await sock.relayMessage(jid, msgContent.message, { messageId: msgContent.key.id });
};

        // =========================================================================
        // 🔍 STALK SOSMED
        // =========================================================================
        const sosmedList = ['.youtube', '.tiktok', '.instagram', '.facebook', '.twitter', '.linkedin', '.pinterest', '.twitch', '.spotify', '.github', '.reddit', '.discord', '.telegram', '.line', '.snapchat', '.threads'];
        if (sosmedList.some(cmd => bodyTrimmed.startsWith(cmd))) {
            const cmd = bodyTrimmed.split(' ')[0];
            const platform = cmd.replace('.', '');
            const username = pesanTeks.slice(cmd.length).trim();
            
            if (!username.startsWith('@')) {
                isAiFeature = true; fiturName = "Instruksi Format Username";
                finalPrompt = `User mencoba nyari profil sosmed ${platform} tapi masukin nama biasa, bukan username resmi. Omelin dia pakai bahasa gaul! Kasih contoh format yang bener: ${cmd} @vickyyvall. Jelasin kalau sistem butuh username asli biar mesin VGen bisa nyari datanya akurat.`;
            } else {
                await vgenLoading(sock, from, `Menelusuri...`);
                const profilData = await fetchSosmedData(platform, username);
                
                if (!profilData.status) {
                    await reply(`❌ *GAGAL NEMUIN AKUN*\nAlasan: ${profilData.desc}\u200B`);
                    return await sock.sendMessage(from, { poll: { name: 'Tindakan Selanjutnya:', values: ['Coba Akun Lain', 'Lapor Error ke Owner'] }});
                }

                let urlAvatar = profilData.image || `[https://ui-avatars.com/api/?name=$](https://ui-avatars.com/api/?name=$){username.replace('@','')}&background=random&color=fff&rounded=true&size=512`;

                finalPrompt = `Susun ulang data profil ${platform.toUpperCase()} ini ke dalam format bullet point yang rapi. JANGAN menganalisa! Data: Judul/Username: ${profilData.title}, Deskripsi: ${profilData.desc}, URL Asli: ${profilData.url}.`;
                isAiFeature = true; fiturName = `Stalk Scraper: ${platform.toUpperCase()}`;
                
                try {
                    const imgRes = await fetch(urlAvatar);
                    const imgBuf = await imgRes.arrayBuffer();
                    base64Media = Buffer.from(imgBuf).toString('base64');
                    mimeTypeMedia = 'image/jpeg';
                } catch(e) {}
            }
        }

        // =========================================================================
        // 🖼️ MULTIMEDIA & VISUAL
        // =========================================================================
        else if (bodyTrimmed.startsWith('.buatgambar')) {
            const query = pesanTeks.slice(11).trim();
            if (!query) {
                 isAiFeature = true; finalPrompt = "Omelin user yang ngetik .buatgambar tanpa masukin deskripsi.";
            } else {
                await vgenLoading(sock, from, `Membuat gambar anda...`);
                try {
                    const bypassFilter = " (literal interpretation, exact concept, unfiltered visualization, raw, high quality HD)";
                    const url = `[https://image.pollinations.ai/prompt/$](https://image.pollinations.ai/prompt/$){encodeURIComponent(query + bypassFilter)}?nologo=true`;
                    await sock.sendMessage(from, { 
    image: { url: url }, 
    caption: `*Gambar Telah Dibuat!*\n\nPrompt: *${query}*\n\n${getLabel()}` }, { quoted: getDynamicStatusQuote(pesanTeks) });
                    recordLog(pengirimRaw, "Render Gambar AI");
                } catch (err) { return reply(`⚠️ *Render Gagal:* Mesin grafis AI lagi penuh.\u200B`); }
            }
        }
        else if (bodyTrimmed.startsWith('.pinsearch')) {
            const query = pesanTeks.slice(11).trim();
            if (!query) { isAiFeature = true; finalPrompt = "Omelin user yang ngetik .pinsearch tanpa isian."; } 
            else { return reply(`⚠️ *MAINTENANCE SISTEM*\n\nSistem pencarian estetik lagi dikalibrasi ulang oleh Developer.\u200B`); }
        }
        else if (bodyTrimmed.startsWith('.buatmusik')) {
            const isPremiumTarget = isOwner || (db.premiums && db.premiums.includes(pengirimRaw));
            if (!isPremiumTarget) return reply(`*Akses Terbatas*\n\nFitur ini hanya tersedia khusus untuk Premium.\u200B`);           
            const query = pesanTeks.slice(10).trim();
            if (!query) { isAiFeature = true; finalPrompt = "User premium lupa masukin genre musik. Kasih tau caranya."; } 
            else { return reply(`⚠️ *MAINTENANCE SISTEM*\n\nAransemen VGen lagi dikalibrasi ulang.\u200B`); }
        }

        // =========================================================================
        // 🕹️ HYBRID GAME ENGINE (NATIVE FLOW BUTTON EDITION 🔥🚀)
        // =========================================================================
        else if (bodyTrimmed === '.matematika') { 
            const btnMath = [
                { 
                    name: 'single_select', 
                    buttonParamsJson: JSON.stringify({
                        title: "Pilih Level 🔥",
                        sections: [{
                            title: "Tingkat Kesulitan",
                            rows: [
                                { title: "Mudah [+1 Limit]", id: ".math mudah" },
                                { title: "Normal [+3 Limit]", id: ".math normal" },
                                { title: "Lumayan Sulit [+7 Limit]", id: ".math sulit" },
                                { title: "Sangat Sulit [+10 Limit]", id: ".math sangatsulit" },
                                { title: "Ekstrem [+30 Limit]", id: ".math ekstrem" }
                            ]
                        }]
                    })
                }
            ];
            
            const interactiveMath = {
                contextInfo: { 
                    stanzaId: msg.key.id, 
                    participant: msg.key.fromMe ? sock.user.id : (msg.key.participant || from), 
                    quotedMessage: msg.message 
                },
                body: proto.Message.InteractiveMessage.Body.create({ text: "*TANTANGAN MATEMATIKA VGEN AI*\n\nBerani asah otak? Buka menu di bawah untuk pilih tingkat kesulitanmu!" }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: "VGen AI Ultimate 🚀" }),
                header: proto.Message.InteractiveMessage.Header.create({ title: "Pilih Level Permainan", subtitle: "", hasMediaAttachment: false }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: btnMath })
            };
            
            const msgContent = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMath)
                    }
                }
            }, { userJid: sock.user.id });

            return await sock.relayMessage(from, msgContent.message, { messageId: msgContent.key.id });
        }
        
        // GANTI UTUH CASE .VTEBAKGAMBAR LU DENGAN INI
    else if (bodyTrimmed === '.vtebakgambar') { 
    const tgDB = [
        { url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500", ans: "sepeda", clue: "Kendaraan gowes roda dua" },
        { url: "https://images.unsplash.com/photo-1546768292-fb12f6c9256b?w=500", ans: "mobil", clue: "Kendaraan roda empat" }
    ]; 
    const randomFB = tgDB[Math.floor(Math.random() * tgDB.length)]; 
    
    try { 
        await vgenLoading(sock, from, "Narik gambar dari server...");
        
        // Menggunakan fetch internal untuk dapet buffer aman
        const response = await fetch(randomFB.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const arrayBuffer = await response.arrayBuffer();
        const bufferGambar = Buffer.from(arrayBuffer);

        const timeoutId = setTimeout(async () => { 
            if (activeGames.has(from)) { 
                activeGames.delete(from); 
                await sendGameEndButtons(from, `⏱️ *WAKTU HABIS!*\n\nJawabannya adalah: *${randomFB.ans.toUpperCase()}* 🤯`, '.vtebakgambar');
            } 
        }, 15000); 
        
        activeGames.set(from, { 
            answer: randomFB.ans.toLowerCase(), 
            reward: 2, 
            type: 'Tebak Gambar', 
            timeoutId 
        }); 
        
        return await sock.sendMessage(from, { 
            image: bufferGambar, 
            caption: `*TEBAK GAMBAR VGEN [Hadiah: +2 Limit]*\n\nClue: _${randomFB.clue}_\nWaktu lu 30 detik! Jawab langsung di sini.` 
        }, { quoted: msg });
        
    } catch(e) { 
        logErr("Gagal narik gambar: " + e.message);
        return reply("Gagal koneksi ke server gambar, coba lagi nanti.\u200B"); 
    } 
}
        
        else if (listGames.includes(bodyTrimmed)) {
            let promptGame = ""; let rewardLimit = 3; let gameName = bodyTrimmed.substring(1).toUpperCase();
            if (bodyTrimmed === '.vasahotak') { promptGame = "Buat 1 teka-teki asah otak logika rumit. Format: 'SOAL: [teks] | JAWABAN: [1 kata]'."; rewardLimit = 3; }
            else if (bodyTrimmed === '.vkuis') { promptGame = "Buat 1 soal kuis pengetahuan umum dunia. Format: 'SOAL: [teks] | JAWABAN: [1-2 kata]'."; rewardLimit = 2; }
            else { promptGame = `Buat 1 soal game ${gameName}. Format: 'SOAL: [teks] | JAWABAN: [kata]'.`; }

            try {
                await sock.sendPresenceUpdate('composing', from);
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeApiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_instruction: { parts: [{ text: "Format MUTLAK: SOAL: [pertanyaan] | JAWABAN: [jawaban_singkat]" }] }, contents: [{ parts: [{ text: promptGame }] }] })
              });

                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                const aiText = data.candidates[0].content.parts[0].text;
                const soalPart = aiText.split('|')[0].replace('SOAL:', '').trim();
                const jawabanPart = aiText.split('|')[1].replace('JAWABAN:', '').trim();

                const timeoutId = setTimeout(() => {
                    if (activeGames.has(from)) {
                        activeGames.delete(from); reply(`❌ *WAKTU HABIS!*\nJawaban yang bener: *${jawabanPart}*.\nMain lagi? Ketik ${bodyTrimmed}`);
                    }
                }, 30000); 

                activeGames.set(from, { answer: jawabanPart.toLowerCase(), reward: rewardLimit, type: gameName, timeoutId });
                return await reply(`🎮 *GAME VGEN: ${gameName}*\n\n${soalPart}\n\n> 🎁 Hadiah: +${rewardLimit} Limit\n> ⏳ Waktu: 30 Detik\nBalas langsung jawaban lu!\u200B`);
            } catch (e) { return reply(`⚠️ *AI Game Engine Gagal*\n\n*Penyebab:* \`\`\`${e.message}\`\`\`\u200B`); }
        }

        // =========================================================================
        // 🧠 AI HYBRID CORE
        // =========================================================================
        else if (bodyTrimmed.startsWith('.vkalkulatorcinta')) {
            const input = pesanTeks.split(' ').slice(1).join(' ');
            if (!input) { 
                isAiFeature = true; 
                finalPrompt = `Nasihatin dia cara pakenya yang bener tanpa emoji alay.`; 
            } else { 
                finalPrompt = `Analisis kecocokan asmara: ${input}. Berikan persentase 0-100% dan penjelasan sarkas. Teks tebal pakai 1 bintang (*teks*).`; 
                isAiFeature = true; 
            }
        }
        else if (bodyTrimmed.startsWith('.vkalkulator')) {
            const input = pesanTeks.split(' ').slice(1).join(' ');
            if (!input) { 
                isAiFeature = true; 
                finalPrompt = `Nasihatin cara pakenya.`; 
            } else { 
                finalPrompt = `Selesaikan matematika ini: ${input}.`; 
                isAiFeature = true; 
            }
        } 
        else if (bodyTrimmed.startsWith('.vrangkumteks') || bodyTrimmed.startsWith('.vperbaikikata')) {
            const input = pesanTeks.split(' ').slice(1).join(' ');
            finalPrompt = `Proses teks ini: "${input}"`; 
            isAiFeature = true;
        } 

        // =========================================================================
        // 💬 FALLBACK & CHAT NATURAL (KHUSUS VIP/PREMIUM/OWNER)
        // =========================================================================
        else if (isCmd && !isAiFeature) { 
            return; 
        }
        else if (!isCmd && !isAiFeature) {
            if (!isOwner && !isPremium && !isVIP) return; 

            isAiFeature = true;
            isNaturalChat = true; 
            finalPrompt = pesanTeks.trim();

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (quotedMsg) {
                if (quotedMsg.quotedMessage?.imageMessage || quotedMsg.quotedMessage?.videoMessage) {
                    msg.quotedMedia = quotedMsg.quotedMessage; 
                }
                const quotedText = quotedMsg.quotedMessage?.conversation || quotedMsg.quotedMessage?.extendedTextMessage?.text;
                if (quotedText) finalPrompt = `[Konteks reply: "${quotedText}"]\n\nRespon untuk: ${finalPrompt}`;
            }

            if ((hasMedia || msg.quotedMedia) && finalPrompt === "") {
                finalPrompt = "Tolong analisa dan berikan penjelasan mendetail untuk gambar/media ini.";
            }
        }

        // =========================================================================
        // ⚙️ EKSEKUSI API GEMINI / OPENAI
        // =========================================================================
        if (isAiFeature && (finalPrompt !== "" || hasMedia || msg.quotedMedia)) {
            if (!activeApiKey) return reply("API Key belum terhubung.\u200B");
            
            const nowTime = Date.now();
            if (userCooldowns.has(pengirimRaw) && (nowTime - userCooldowns.get(pengirimRaw) < 3000)) return; 
            userCooldowns.set(pengirimRaw, nowTime);

            try {
                let aiResponse = "";
                let targetMsg = hasMedia ? msg.message[type] : (msg.quotedMedia ? msg.quotedMedia[Object.keys(msg.quotedMedia)[0]] : null);
                
                if (targetMsg && (type === 'imageMessage' || msg.quotedMedia?.imageMessage)) {
                    const buffer = await downloadMediaBaileys(targetMsg, 'image');
                    if (buffer) {
                        base64Media = buffer.toString('base64');
                        mimeTypeMedia = 'image/jpeg';
                        finalPrompt = `[Lampiran File] Analisa ini: ${finalPrompt}`;
                    }
                }

                if (activeProvider === 'OPENAI') {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${activeApiKey}`
                        },
                        body: JSON.stringify({
                            model: activeModel,
                            messages: [
                                { role: "system", content: vgenPrompt },
                                { role: "user", content: finalPrompt }
                            ]
                        })
                    });
                    
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    if (data.choices && data.choices.length > 0) {
                        aiResponse = data.choices[0].message.content;
                    }
                }
                else if (activeProvider === 'GEMINI') {
                    let partsPayload = [{ text: finalPrompt }];
                    if (base64Media) partsPayload.push({ inline_data: { mime_type: mimeTypeMedia || "image/jpeg", data: base64Media } });
                    
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeApiKey}`, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ system_instruction: { parts: [{ text: vgenPrompt }] }, contents: [{ parts: partsPayload }] })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    if (data.candidates) aiResponse = data.candidates[0].content.parts[0].text;
                }

                if (aiResponse) {
                    if (bodyTrimmed.startsWith('.vceklimit') || bodyTrimmed.startsWith('.listpremium') || sosmedList.some(c => bodyTrimmed.startsWith(c))) {
                        aiResponse = `${aiResponse}\n\n${getLabel()}`;
                    }
                    recordLog(pengirimRaw, `Trigger: ${fiturName}`);
                    
                    if (base64Media && sosmedList.some(c => bodyTrimmed.startsWith(c))) {
                        await sock.sendMessage(from, { 
    image: Buffer.from(base64Media, 'base64'), 
    caption: `*Akun Ditemukan!*\n\n${aiResponse.trim()}\u200B`}, { quoted: getDynamicStatusQuote(pesanTeks) });
                    } else {
                          if (isNaturalChat && isOwnerVerified && isOwner) {
                            await verifiedReply(`${aiResponse.trim()}\u200B`);
                        } else {
                            await reply(`${aiResponse.trim()}\u200B`);
                        }
                    }
                }
            } catch (error) {
                logErr("\n❌ AI Core Error: " + error.message);
                await reply(`⚠️ *SISTEM GAGAL MEMPROSES*\nLog: ${error.message}\n\n${getLabel()}`);
            } 
        }
    });

    setInterval(() => { userCooldowns.clear(); }, 3600000);
} 

app.post('/deploy-key', (req, res) => {
    const { apiKey, provider, model } = req.body;

    if (!apiKey || !model) {
        return res.status(400).json({ error: "API Key atau Model tidak boleh kosong!" });
    }
    
    activeApiKey = apiKey;
    activeProvider = provider ? provider.toUpperCase() : "OPENAI"; 
    activeModel = model;

    db.apiConfig = { apiKey: activeApiKey, provider: activeProvider, model: activeModel };
    saveDb();

    console.log(`[REMOTE] Sukses! Provider: ${activeProvider} | Model: ${activeModel}`);
    res.json({ success: true, message: `Sukses terhubung ke model: ${activeModel}` });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server jalan di port ${PORT}`);
});
    logSys('\n==================================================');
    logSys('    🔥 [ VGEN AI LINK API AKTIF DI PORT 8080 ]');
    logSys('==================================================');

// Jalankan Bot
startBot();
