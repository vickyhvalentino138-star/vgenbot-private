/**
 * =========================================================================
 * ★ VGEN AI TERMINAL (ULTIMATE LITE - STRICT EDITION + MEMORY) ★
 * =========================================================================
 * Arsitektur khusus AI Core dan sistem deployment.
 * MESIN: BAILEYS MURNI.
 * DITAMBAHKAN: Sistem Ingatan (Context History) untuk AI.
 * =========================================================================
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const pino = require('pino');

// 🚀 MESIN BAILEYS MURNI
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    downloadContentFromMessage 
} = require('@whiskeysockets/baileys');

// Pastikan file prompt.js ada
let vgenPrompt = "";
try { vgenPrompt = require('./prompt.js'); } catch (e) { vgenPrompt = "Kamu adalah VGen AI, asisten yang cerdas dan efisien."; }

const app = express();
app.use(cors());
app.use(express.json());

const c = {
    g: '\x1b[34m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m', w: '\x1b[37m', rst: '\x1b[0m'
};

function logInfo(msg) { console.log(`${c.g}[INFO] ${msg}${c.rst}`); }
function logWarn(msg) { console.log(`${c.y}[WARN] ${msg}${c.rst}`); }
function logErr(msg) { console.log(`${c.r}[ERROR] ${msg}${c.rst}`); }
function logSys(msg) { console.log(`${c.c}[SYSTEM] ${msg}${c.rst}`); }

// =========================================================================
// 🗄️ VARIABEL GLOBAL, MEMORY & REMOTE CONFIG
// =========================================================================
const dbFile = './database.json';
let db = { apiConfig: {} };

if (fs.existsSync(dbFile)) {
    try { 
        db = JSON.parse(fs.readFileSync(dbFile)); 
    } catch (e) { logErr("Gagal membaca database."); }
}

function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

let activeProvider = db.apiConfig?.provider || null; 
let activeApiKey = db.apiConfig?.apiKey || null; 
let activeModel = db.apiConfig?.model || null; 
let isAiMuted = false; 

// 🔥 TARGET EKSKLUSIF (HANYA MERESPON NOMOR INI)
const ALLOWED_NUMBERS = ["6281292729210", "6289668591566"];

// 🧠 SISTEM INGATAN AI (CHAT HISTORY)
const userHistory = {};
const MAX_HISTORY = 6; // Menyimpan 6 pesan terakhir agar konteks nyambung

// Fungsi Download Media
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
let sock; 
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('vgen_session');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        browser: ['VGen AI Ultimate', 'Mac OS', 'Safari']
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update; 
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            await sock.sendPresenceUpdate('available');
            
            console.log(`\n==================================================`);
            console.log(` 🚀 [ VGEN AI STRICT MODE ] AI REVOLUTION ACTIVE✅ `);
            console.log(` 👤 Developer: Vicky | Mesin Siap Tempur 24/7 `);
            console.log(`==================================================\n`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us') || from === 'status@broadcast') return; // Mengabaikan Grup dan Status Story WA

        let senderJid = msg.key.fromMe ? sock.user.id : (msg.key.participant || from);
        let pengirimRaw = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

        const type = Object.keys(msg.message)[0];
        let pesanTeks = '';
        let hasMedia = false;
        
        if (type === 'conversation') { pesanTeks = msg.message.conversation; } 
        else if (type === 'extendedTextMessage') { pesanTeks = msg.message.extendedTextMessage.text; }
        else if (type === 'imageMessage') { pesanTeks = msg.message.imageMessage.caption || ''; hasMedia = true; }
        else if (type === 'videoMessage') { pesanTeks = msg.message.videoMessage.caption || ''; hasMedia = true; }
        else if (type === 'documentMessage') { pesanTeks = msg.message.documentMessage.caption || ''; hasMedia = true; }
        else if (type === 'stickerMessage') { hasMedia = true; }

        const bodyTrimmed = pesanTeks.toLowerCase().trim();

        const reply = async (text) => {
            return await sock.sendMessage(from, { text: text }, { quoted: msg });
        };

        // =========================================================================
        // 🔒 KONTROL MUTE / UNMUTE (RESET HISTORY JIKA MUTE)
        // =========================================================================
        if (bodyTrimmed === '.mute' || bodyTrimmed === '.unmute') {
            if (bodyTrimmed === '.mute') { 
                if (isAiMuted) return reply("Status respon AI saat ini sudah dalam keadaan nonaktif.");
                isAiMuted = true; 
                delete userHistory[from]; 
                return reply("Respon AI telah dinonaktifkan secara sistem."); 
            }
            if (bodyTrimmed === '.unmute') { 
                if (!isAiMuted) return reply("Status respon AI saat ini sudah aktif.");
                isAiMuted = false; 
                return reply("Respon AI telah diaktifkan kembali."); 
            }
        }

        // =========================================================================
        // 🛡️ FILTER ABSOLUT 
        // =========================================================================
        if (msg.key.fromMe) return; 
        if (!ALLOWED_NUMBERS.includes(pengirimRaw)) return; 
        if (isAiMuted) return; 

        // Inisialisasi memori user jika belum ada
        if (!userHistory[from]) userHistory[from] = [];

        // =========================================================================
        // 🧠 AI HYBRID CORE (DENGAN CONTEXT-REPLY YANG AKURAT)
        // =========================================================================
        let finalPrompt = pesanTeks.trim();
        let base64Media = null; 
        let mimeTypeMedia = null;

        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
        let quotedMediaMsg = null;
        
        if (quotedMsg) {
            const quotedKeys = Object.keys(quotedMsg.quotedMessage || {});
            const hasQuotedMedia = quotedKeys.some(k => ['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage'].includes(k));
            
            if (hasQuotedMedia) {
                quotedMediaMsg = quotedMsg.quotedMessage; 
            }
            // Mengambil teks asli dari bubble chat lawan yang di-reply
            const quotedText = quotedMsg.quotedMessage?.conversation || quotedMsg.quotedMessage?.extendedTextMessage?.text;
            if (quotedText) finalPrompt = `[Konteks reply: "${quotedText}"]\n\nRespon untuk: ${finalPrompt}`;
        }

        if ((hasMedia || quotedMediaMsg) && finalPrompt === "") {
            finalPrompt = "Tolong analisa dan berikan respon mendetail untuk media ini.";
        }

        if (finalPrompt !== "" || hasMedia || quotedMediaMsg) {
            if (!activeApiKey) return reply("Sistem: API Key belum terhubung ke mesin port 8080.");
            
            // 🔥 STATUS MENGETIK DIKIRIM HANYA KE ROOM TARGET ('from')
            await sock.sendPresenceUpdate('composing', from);
            
            try {
                let aiResponse = "";
                let targetMsg = hasMedia ? msg.message[type] : (quotedMediaMsg ? quotedMediaMsg[Object.keys(quotedMediaMsg)[0]] : null);
                
                if (targetMsg && (type === 'imageMessage' || quotedMediaMsg?.imageMessage || type === 'stickerMessage' || quotedMediaMsg?.stickerMessage)) {
                    const mediaType = (type === 'imageMessage' || quotedMediaMsg?.imageMessage) ? 'image' : 'sticker';
                    const buffer = await downloadMediaBaileys(targetMsg, mediaType);
                    if (buffer) {
                        base64Media = buffer.toString('base64');
                        mimeTypeMedia = mediaType === 'sticker' ? 'image/webp' : 'image/jpeg';
                        finalPrompt = `[Lampiran File] Analisa ini: ${finalPrompt}`;
                    }
                }

                if (activeProvider === 'OPENAI') {
                    const openAiMessages = [
                        { role: "system", content: vgenPrompt },
                        ...userHistory[from].map(h => ({ role: h.role, content: h.content })),
                        { role: "user", content: finalPrompt }
                    ];

                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeApiKey}` },
                        body: JSON.stringify({ model: activeModel, messages: openAiMessages })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    if (data.choices && data.choices.length > 0) aiResponse = data.choices[0].message.content;
                }
                else if (activeProvider === 'GEMINI') {
                    let geminiContents = userHistory[from].map(h => ({
                        role: h.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: h.content }]
                    }));
                    
                    let currentParts = [{ text: finalPrompt }];
                    if (base64Media) {
                        currentParts.push({ inline_data: { mime_type: mimeTypeMedia || "image/jpeg", data: base64Media } });
                    }
                    geminiContents.push({ role: "user", parts: currentParts });

                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeApiKey}`, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ system_instruction: { parts: [{ text: vgenPrompt }] }, contents: geminiContents })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    if (data.candidates) aiResponse = data.candidates[0].content.parts[0].text;
                }

                if (aiResponse) {
                    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const finalOutput = `${aiResponse.trim()}\n\n*(AI) - ${timeNow}*`;
                    await reply(finalOutput);

                    // Simpan history chat
                    userHistory[from].push({ role: 'user', content: finalPrompt });
                    userHistory[from].push({ role: 'assistant', content: aiResponse });
                    
                    if (userHistory[from].length > MAX_HISTORY) {
                        userHistory[from] = userHistory[from].slice(-MAX_HISTORY);
                    }
                }
            } catch (error) {
                logErr("\n❌ AI Core Error: " + error.message);
            } finally {
                // 🔥 MATIKAN STATUS MENGETIK SETELAH SELESAI
                await sock.sendPresenceUpdate('paused', from);
            }
        }
    });
} 

// =========================================================================
// 🌐 DEPLOYMENT SERVER 
// =========================================================================
app.post('/deploy-key', (req, res) => {
    const { apiKey, provider, model } = req.body;

    if (!apiKey || !model) return res.status(400).json({ error: "API Key atau Model tidak boleh kosong!" });
    
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
    logSys('\n==================================================');
    logSys(`    ✅ [ VGEN AI API UDAH AKTIF DI PORT ${PORT} ]`);
    logSys('==================================================');
});

startBot();
