/**
 * VGEN AI - TELEGRAM BOT EDITION
 * Menggantikan engine WhatsApp/Baileys dengan Telegram Bot API.
 * Node.js 22+.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

let vgenPrompt = '';
try {
    vgenPrompt = require('./prompt.js');
} catch {
    vgenPrompt = 'Kamu adalah VGen AI, asisten yang cerdas dan efisien.';
}

// ============================================================
// KONFIGURASI
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'PASTE_BOT_TOKEN_DI_SINI';
const PORT = process.env.PORT || 8080;
const MAX_HISTORY = 15;
const MAX_TEXT_FILE = 5000;

if (TELEGRAM_BOT_TOKEN === 'PASTE_BOT_TOKEN_DI_SINI') {
    console.error('❌ TELEGRAM_BOT_TOKEN belum diisi. Set environment variable TELEGRAM_BOT_TOKEN.');
    process.exit(1);
}

// ============================================================
// DATABASE API CONFIG
// ============================================================
const dbFile = path.join(__dirname, 'database.json');
let db = { apiConfig: {} };

if (fs.existsSync(dbFile)) {
    try {
        db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch (e) {
        console.error('❌ Gagal membaca database.json:', e.message);
    }
}

function saveDb() {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

let activeProvider = db.apiConfig?.provider || null;
let activeApiKey = db.apiConfig?.apiKey || null;
let activeModel = db.apiConfig?.model || null;
let activeBaseUrl = db.apiConfig?.baseUrl || null;

// Memori per chat Telegram.
const userHistory = new Map();
const aiMutedChats = new Set();

function historyFor(chatId) {
    const key = String(chatId);
    if (!userHistory.has(key)) userHistory.set(key, []);
    return userHistory.get(key);
}

function pushHistory(chatId, role, content) {
    const history = historyFor(chatId);
    history.push({ role, content });
    if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
    }
}

function cleanText(value) {
    return String(value || '').trim();
}

function nowWIB() {
    return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function displayName(msg) {
    const u = msg.from || {};
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Telegram User';
}

function isCommand(text) {
    return /^\/(?:start|help|mute|unmute|status|reset)(?:@\w+)?(?:\s|$)/i.test(text);
}

function splitForTelegram(text, max = 4000) {
    const out = [];
    let rest = String(text || '');
    while (rest.length > max) {
        let cut = rest.lastIndexOf('\n', max);
        if (cut < 500) cut = max;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut).trimStart();
    }
    if (rest) out.push(rest);
    return out.length ? out : [''];
}

async function sendReply(bot, chatId, text, extra = {}) {
    for (const chunk of splitForTelegram(text)) {
        await bot.sendMessage(chatId, chunk, extra);
    }
}

// ============================================================
// TELEGRAM BOT
// ============================================================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('polling_error', (err) => {
    console.error('[TELEGRAM POLLING ERROR]', err.message);
});

bot.on('webhook_error', (err) => {
    console.error('[TELEGRAM WEBHOOK ERROR]', err.message);
});

bot.onText(/^\/(start|help)(?:@\w+)?$/i, async (msg) => {
    const text = `VGen AI Telegram Bot aktif.\n\n` +
        `Kirim pertanyaan langsung untuk mulai ngobrol.\n` +
        `/mute - matikan respon AI di chat ini\n` +
        `/unmute - aktifkan lagi\n` +
        `/reset - hapus memori percakapan chat ini\n` +
        `/status - cek provider dan model`;
    await sendReply(bot, msg.chat.id, text);
});

bot.onText(/^\/mute(?:@\w+)?$/i, async (msg) => {
    aiMutedChats.add(String(msg.chat.id));
    userHistory.delete(String(msg.chat.id));
    await sendReply(bot, msg.chat.id, 'Respon AI dimatikan untuk chat ini. Pakai /unmute kalau mau mengaktifkannya lagi.');
});

bot.onText(/^\/unmute(?:@\w+)?$/i, async (msg) => {
    aiMutedChats.delete(String(msg.chat.id));
    await sendReply(bot, msg.chat.id, 'Respon AI diaktifkan lagi.');
});

bot.onText(/^\/reset(?:@\w+)?$/i, async (msg) => {
    userHistory.delete(String(msg.chat.id));
    await sendReply(bot, msg.chat.id, 'Memori percakapan chat ini sudah direset.');
});

bot.onText(/^\/status(?:@\w+)?$/i, async (msg) => {
    await sendReply(bot, msg.chat.id,
        `Status VGen AI\n` +
        `Provider: ${activeProvider || 'BELUM DISET'}\n` +
        `Model: ${activeModel || 'BELUM DISET'}\n` +
        `Waktu WIB: ${nowWIB()}`
    );
});

async function downloadTelegramFile(fileId) {
    try {
        const file = await bot.getFile(fileId);
        if (!file.file_path) return null;
        const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download Telegram gagal (${res.status})`);
        const buffer = Buffer.from(await res.arrayBuffer());
        return { buffer, filePath: file.file_path };
    } catch (e) {
        console.error('[MEDIA DOWNLOAD]', e.message);
        return null;
    }
}

function getMediaFromMessage(msg) {
    if (msg.photo?.length) {
        return {
            fileId: msg.photo[msg.photo.length - 1].file_id,
            mediaType: 'image',
            mimeType: 'image/jpeg',
            fileName: 'telegram-photo.jpg'
        };
    }

    if (msg.document) {
        return {
            fileId: msg.document.file_id,
            mediaType: 'document',
            mimeType: msg.document.mime_type || 'application/octet-stream',
            fileName: msg.document.file_name || 'document'
        };
    }

    return null;
}

async function buildMediaPrompt(msg, basePrompt) {
    const media = getMediaFromMessage(msg);
    if (!media) return { finalPrompt: basePrompt, base64Media: null, mimeTypeMedia: null };

    const downloaded = await downloadTelegramFile(media.fileId);
    if (!downloaded) {
        return {
            finalPrompt: `[Sistem: Lampiran Telegram tidak berhasil diunduh.]\n\n${basePrompt}`,
            base64Media: null,
            mimeTypeMedia: null
        };
    }

    const folder = path.join(__dirname, 'riwayat_media');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const safeName = media.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const archiveName = `${Date.now()}_${safeName}`;
    try {
        fs.writeFileSync(path.join(folder, archiveName), downloaded.buffer);
    } catch (e) {
        console.error('[MEDIA ARCHIVE]', e.message);
    }

    if (media.mediaType === 'document') {
        const lower = media.fileName.toLowerCase();
        const readable = media.mimeType.includes('text') ||
            media.mimeType.includes('json') ||
            media.mimeType.includes('javascript') ||
            /\.(js|json|txt|csv|html|css|py|md)$/i.test(lower);

        if (readable) {
            const text = downloaded.buffer.toString('utf8').slice(0, MAX_TEXT_FILE);
            return {
                finalPrompt: `[Sistem: Pengguna mengirim dokumen "${media.fileName}"]\nIsi Dokumen:\n\`\`\`\n${text}\n\`\`\`\n\nPesan: ${basePrompt}`,
                base64Media: null,
                mimeTypeMedia: null
            };
        }

        if (media.mimeType === 'application/octet-stream' || /\.(apk|bin|dat|exe|7z|rar|zip)$/i.test(lower)) {
            return {
                finalPrompt: `[Sistem: Pengguna mengirim file "${media.fileName}". Jelaskan dengan jujur bahwa format biner ini tidak dibaca sebagai isi dokumen oleh bot.]\n\n${basePrompt}`,
                base64Media: null,
                mimeTypeMedia: null
            };
        }

        // Untuk provider vision yang mendukung file sebagai inline image, hanya gambar yang dikirim sebagai base64.
        return {
            finalPrompt: `[Sistem: Pengguna mengirim lampiran dokumen "${media.fileName}". Analisa jika formatnya dapat dipahami oleh model.]\n\n${basePrompt}`,
            base64Media: null,
            mimeTypeMedia: media.mimeType
        };
    }

    return {
        finalPrompt: `[Sistem: Pengguna mengirim gambar. Analisa gambar tersebut.]\n\n${basePrompt}`,
        base64Media: downloaded.buffer.toString('base64'),
        mimeTypeMedia: 'image/jpeg'
    };
}

async function askAI(chatId, finalPrompt, base64Media, mimeTypeMedia) {
    if (!activeApiKey || !activeModel || !activeProvider) {
        throw new Error('Provider/API key/model belum dikonfigurasi. Gunakan endpoint /deploy-key terlebih dahulu.');
    }

    const history = historyFor(chatId);

    if (activeProvider === 'OPENAI') {
        let userContent = finalPrompt;
        if (base64Media) {
            userContent = [
                { type: 'text', text: finalPrompt },
                { type: 'image_url', image_url: { url: `data:${mimeTypeMedia || 'image/jpeg'};base64,${base64Media}` } }
            ];
        }

        const messages = [
            { role: 'system', content: vgenPrompt },
            ...history,
            { role: 'user', content: userContent }
        ];

        const endpoint = activeBaseUrl || 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeApiKey}`
            },
            body: JSON.stringify({ model: activeModel, messages })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(data.error?.message || `OpenAI HTTP ${res.status}`);
        }
        return data.choices?.[0]?.message?.content || 'Model tidak mengembalikan jawaban.';
    }

    if (activeProvider === 'GEMINI') {
        const contents = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        const parts = [{ text: finalPrompt }];
        if (base64Media) {
            parts.push({ inline_data: { mime_type: mimeTypeMedia || 'image/jpeg', data: base64Media } });
        }
        contents.push({ role: 'user', parts });

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(activeApiKey)}`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: vgenPrompt }] },
                contents
            })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
        }
        return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'Model tidak mengembalikan jawaban.';
    }

    throw new Error(`Provider tidak dikenal: ${activeProvider}`);
}

bot.on('message', async (msg) => {
    // Command ditangani oleh handler di atas.
    const text = cleanText(msg.text || msg.caption || '');
    if (!text && !getMediaFromMessage(msg)) return;
    if (isCommand(text)) return;

    const chatId = String(msg.chat.id);
    const sender = displayName(msg);
    const type = msg.photo ? 'photo' : msg.document ? 'document' : 'text';

    console.log(`\n[INCOMING TELEGRAM] ${nowWIB()} | ${sender} | chat=${chatId} | type=${type}`);
    if (text) console.log(`[MESSAGE] ${text.slice(0, 120)}`);

    if (aiMutedChats.has(chatId)) return;

    // Pesan terlalu lama tidak perlu diproses ulang.
    if (msg.date && Math.floor(Date.now() / 1000) - msg.date > 120) return;

    try {
        await bot.sendChatAction(msg.chat.id, getMediaFromMessage(msg)?.mediaType === 'image' ? 'typing' : 'typing');

        const mediaResult = await buildMediaPrompt(msg, text || '[Sistem: Pengguna mengirim media tanpa caption.]');
        const currentTimeInstruction = `[INFO SISTEM: Waktu sekarang ${nowWIB()} WIB. Jika pengguna bertanya waktu saat ini, gunakan waktu ini.]`;
        const finalPrompt = `${currentTimeInstruction}\n\n${mediaResult.finalPrompt}`;

        const response = await askAI(chatId, finalPrompt, mediaResult.base64Media, mediaResult.mimeTypeMedia);
        const rawResponse = cleanText(response);

        // Cek lagi setelah AI selesai supaya mute yang baru diberikan tidak menghasilkan balasan.
        if (aiMutedChats.has(chatId)) return;

        pushHistory(chatId, 'user', finalPrompt);
        pushHistory(chatId, 'assistant', rawResponse);

        await sendReply(bot, msg.chat.id, rawResponse);
    } catch (error) {
        const realError = String(error.message || error).replace(/\n/g, ' ').slice(0, 500);
        console.error('[AI CORE ERROR]', realError);
        await sendReply(bot, msg.chat.id,
            `VGen Engine terkendala.\n\nDetail: ${realError}`
        );
    }
});

// ============================================================
// EXPRESS DEPLOYMENT API
// ============================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
    res.json({
        ok: true,
        service: 'VGen AI Telegram Bot',
        provider: activeProvider,
        model: activeModel,
        timeWIB: nowWIB()
    });
});

app.post('/deploy-key', (req, res) => {
    const { apiKey, provider, model, baseUrl } = req.body || {};
    if (!apiKey || !model) {
        return res.status(400).json({ error: 'API Key atau Model tidak boleh kosong!' });
    }

    activeApiKey = apiKey;
    activeProvider = String(provider || 'OPENAI').toUpperCase();
    activeModel = model;
    activeBaseUrl = baseUrl || null;

    db.apiConfig = {
        apiKey: activeApiKey,
        provider: activeProvider,
        model: activeModel,
        ...(activeBaseUrl ? { baseUrl: activeBaseUrl } : {})
    };
    saveDb();

    console.log(`[DEPLOY] ${activeProvider} / ${activeModel} @ ${nowWIB()}`);
    res.json({ success: true, message: `Sukses terhubung ke model: ${activeModel}` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ VGEN AI TELEGRAM ONLINE di port ${PORT}`);
    console.log(`🤖 Bot siap menerima pesan Telegram`);
});
