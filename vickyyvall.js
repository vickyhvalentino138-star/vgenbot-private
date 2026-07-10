/**
 * =========================================================================
 * ★ VGEN AI TERMINAL (AURORA PREMIUM EDITION) ★
 * =========================================================================
 * Arsitektur khusus AI Core, UI Termux Zuckerberg-Level, & Centang Hijau Mutlak.
 * =========================================================================
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const pino = require('pino');
const util = require('util');
const hapusLogSampah = (args) => {
    const text = util.format(...args);
    if (text.includes('Closing open session') || text.includes('SessionEntry') || text.includes('prekey bundle') || text.includes('_chains') || text.includes('Bad MAC') || text.includes('Session error')) return true;
    return false;
};
const originalLog = console.log;
const originalTrace = console.trace;
const originalDebug = console.debug;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;
console.log = function(...args) { if (!hapusLogSampah(args)) originalLog.apply(console, args); };
console.trace = function(...args) { if (!hapusLogSampah(args)) originalTrace.apply(console, args); };
console.debug = function(...args) { if (!hapusLogSampah(args)) originalDebug.apply(console, args); };
console.info = function(...args) { if (!hapusLogSampah(args)) originalInfo.apply(console, args); };
console.warn = function(...args) { if (!hapusLogSampah(args)) originalWarn.apply(console, args); };
console.error = function(...args) { if (!hapusLogSampah(args)) originalError.apply(console, args); };

// 🚀 MESIN BAILEYS MURNI
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    downloadContentFromMessage,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

let vgenPrompt = "";
try { vgenPrompt = require('./prompt.js'); } catch (e) { vgenPrompt = "Kamu adalah VGen AI, asisten premium yang cerdas dan efisien."; }

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = './database.json';
let db = { apiConfig: {} };
if (fs.existsSync(dbFile)) {
    try { db = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { console.log("\x1b[38;5;196m[ERROR]\x1b[0m Gagal membaca database."); }
}
function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

let activeProvider = db.apiConfig?.provider || null; 
let activeApiKey = db.apiConfig?.apiKey || null; 
let activeModel = db.apiConfig?.model || null; 

// 🧠 SISTEM INGATAN AI (UPGRADED)
const userHistory = {};
const aiMutedChats = {}; 
const MAX_HISTORY = 15; 

async function downloadMediaBaileys(message, type) {
    try {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await(const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
        return buffer;
    } catch (e) { return null; }
}

let sock; 
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('vgen_session');
    
    // 🔥 BALIKIN PAKE FETCH LATEST BIAR GAK KENA ERROR 405 DARI META!
    const { version } = await fetchLatestBaileysVersion(); 

    sock = makeWASocket({
        version, 
        auth: state,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        browser: ['VGen AI Ultimate', 'Chrome', '2.0.0'], // Banner premium lu aman!
        
        // 🚨 NYAWA ANTI-GHAIB TETEP DISINI! INI YANG BIKIN PESAN LU TEMBUS!
        getMessage: async (key) => {
            return {
                conversation: "VGen Engine AI merekonstruksi pesan..."
            };
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; 
        
        if (connection === 'connecting') {
            console.log('\x1b[38;5;213m⏳ Menghubungkan Engine VGen AI ke Server WhatsApp...\x1b[0m');
        }
        if (qr) {
            console.log('\n\x1b[38;5;159m✅ Kode QR siap! Silakan scan:\x1b[0m');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const errCode = lastDisconnect.error?.output?.statusCode;
            console.log(`\x1b[38;5;196m❌ Koneksi terputus (Error: ${errCode}). Auto-Reconnecting...\x1b[0m`);
            if (errCode !== DisconnectReason.loggedOut) startBot();
        } 
        else if (connection === 'open') {
            await sock.sendPresenceUpdate('available');
            
            // 🔥 BANNER AURORA PREMIUM (30+ WARNA GRADASI)
            console.log(`\n\x1b[38;5;51m  ╭─────────────────────────────────────────────────────────────╮
\x1b[38;5;45m  │   ██╗   ██╗ ██████╗ ███████╗███╗   ██╗     █████╗ ██╗     │
\x1b[38;5;39m  │   ██║   ██║██╔════╝ ██╔════╝████╗  ██║    ██╔══██╗██║     │
\x1b[38;5;99m  │   ██║   ██║██║  ███╗█████╗  ██╔██╗ ██║    ███████║██║     │
\x1b[38;5;135m  │   ╚██╗ ██╔╝██║   ██║██╔══╝  ██║╚██╗██║    ██╔══██║██║     │
\x1b[38;5;171m  │    ╚████╔╝ ╚██████╔╝███████╗██║ ╚████║    ██║  ██║██║     │
\x1b[38;5;207m  │     ╚═══╝   ╚═════╝ ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝     │
\x1b[38;5;213m  ╰─────────────────────────────────────────────────────────────╯\x1b[0m`);
            console.log(`     \x1b[38;5;226m✦ PREMIUM ENTERPRISE EDITION ✦ \x1b[0m\x1b[38;5;82m[ CORE ONLINE ]\x1b[0m\n`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        // Bypass notify & append biar command sinkron dari HP lu tetep jalan
        if (m.type !== 'notify' && m.type !== 'append') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us') || from === 'status@broadcast') return; 

                  const { parsePhoneNumber } = require('awesome-phonenumber'); // Narik module dari package.json

        let pengirimRaw = '';
        if (msg.key.fromMe) {
            pengirimRaw = sock.user.id.split('@')[0].split(':')[0];
        } else {
            let targetJid = from.endsWith('@g.us') ? msg.key.participant : from;
            pengirimRaw = targetJid.split('@')[0].split(':')[0];
        }
        pengirimRaw = pengirimRaw.replace(/[^0-9]/g, '');

        // Validasi Mutlak: Paksa awalan '0' atau '8' jadi '62'
        if (pengirimRaw.startsWith('0')) pengirimRaw = '62' + pengirimRaw.slice(1);
        else if (pengirimRaw.startsWith('8')) pengirimRaw = '62' + pengirimRaw;

        // Bikin nomor rapi & elegan buat di Log (misal: +62 812-3456-7890)
        let nomorRapi = '+' + pengirimRaw;
        try {
            const pn = parsePhoneNumber('+' + pengirimRaw);
            if (pn && pn.valid) nomorRapi = pn.number.international;
        } catch (e) {}

        const pushname = msg.pushName || 'Verified User';
        const msgTimestamp = msg.messageTimestamp;
        const currentWaktu = Math.floor(Date.now() / 1000);
        if (currentWaktu - msgTimestamp > 120) {
            console.log(`\x1b[38;5;226m[INFO]\x1b[0m Pesan usang/tertunda terdeteksi. Abaikan biar limit ga jebol!`);
            return;
        }

         // 🎙️ FITUR MEREKAM AUDIO KEBINGUNGAN (RUMUS MATEMATIKA 10-30 DETIK)
        // Menggunakan gelombang Sinus absolut dari waktu (Date.now) untuk ngacak durasi
        const durasiMerekam = Math.floor((Math.abs(Math.sin(Date.now())) * 20) + 10) * 1000;
        await sock.sendPresenceUpdate('recording', from);
        setTimeout(async () => { 
            await sock.sendPresenceUpdate('paused', from); 
        }, durasiMerekam);

        // Filter struktur pesan modern agar engine tidak salah baca (Support Pesan Sementara/Ephemeral)
        let realMsg = msg.message;
        if (realMsg?.ephemeralMessage) realMsg = realMsg.ephemeralMessage.message;
        
        // 🚨 DETEKSI PESAN SEKALI LIHAT
        let isViewOnce = false;
        if (realMsg?.viewOnceMessage) {
            realMsg = realMsg.viewOnceMessage.message;
            isViewOnce = true;
        }
        if (realMsg?.viewOnceMessageV2) {
            realMsg = realMsg.viewOnceMessageV2.message;
            isViewOnce = true;
        }
        if (realMsg?.documentWithCaptionMessage) realMsg = realMsg.documentWithCaptionMessage.message;

        // 🛡️ EKSEKUSI ANTI-SEKALI LIHAT -> LANGSUNG FORWARD KE NOMOR LU (62895410975149)
        if (isViewOnce && !msg.key.fromMe) {
            await sock.sendMessage('62895410975149@s.whatsapp.net', { forward: msg });
            await sock.sendMessage('62895410975149@s.whatsapp.net', { 
                text: `🚨 *STATUS: ANTI SEKALI LIHAT TEMBUS!*\nPengirim: ${pushname} (${nomorRapi})` 
            });
        }


        const type = Object.keys(realMsg).find(key => 
            !['messageContextInfo', 'senderKeyDistributionMessage'].includes(key)
        ) || Object.keys(realMsg)[0];

        let pesanTeks = '';
        let hasMedia = false;
        let isAudio = false; // Deteksi Voice Note
        
                        if (type === 'conversation') { pesanTeks = realMsg.conversation || ''; } 
        else if (type === 'extendedTextMessage') { pesanTeks = realMsg.extendedTextMessage?.text || ''; }        
        else if (type === 'imageMessage') { pesanTeks = realMsg.imageMessage.caption || ''; hasMedia = true; }
        else if (type === 'videoMessage') { pesanTeks = realMsg.videoMessage.caption || ''; hasMedia = true; }
                else if (type === 'documentMessage') { pesanTeks = realMsg.documentMessage.caption || ''; hasMedia = true; }
        else if (type === 'stickerMessage') { 
            console.log(`\x1b[38;5;226m[INFO]\x1b[0m Stiker terdeteksi. BUANG! Mengabaikan stiker agar hemat limit AI.`);
            return; // 🛑 BERHENTI DI SINI! AI GA BAKAL BACA STIKER!
        }
        else if (type === 'contactMessage') { 
            const namaKontak = realMsg.contactMessage.displayName || 'Seseorang';
            pesanTeks = `[Sistem: Pengguna membagikan Kontak WA bernama "${namaKontak}"]`; 
        }
        else if (type === 'contactsArrayMessage') { 
            pesanTeks = `[Sistem: Pengguna membagikan daftar banyak Kontak WA]`; 
        }
        else if (type === 'audioMessage') { isAudio = true; } // Syakir ngirim VN
        else if (type === 'templateMessage') {
            const tm = realMsg.templateMessage;
            pesanTeks = tm.hydratedTemplate?.hydratedContentText || 
                        tm.hydratedTemplate?.extendedTextMessage?.text || 
                        tm.hydratedFourRowTemplate?.body?.text || '';
        }
        else if (type === 'interactiveMessage') {
            const im = realMsg.interactiveMessage;
            pesanTeks = im.body?.text || im.header?.title || im.header?.subtitle || '';
        }
        else if (type === 'buttonsMessage') {
            pesanTeks = realMsg.buttonsMessage.contentText || realMsg.buttonsMessage.text || '';
        }
        else if (type === 'listMessage') {
            pesanTeks = realMsg.listMessage.description || realMsg.listMessage.title || '';
        }

        const bodyTrimmed = pesanTeks.toLowerCase().trim();
        const isCmd = bodyTrimmed.startsWith('.') || bodyTrimmed.startsWith('!') || bodyTrimmed.startsWith('/');

        // 🔥 BLOKIR PESAN SENDIRI BIAR GAK MASUK LOG INCOMING!
        if (msg.key.fromMe && !isCmd) return;

                // 🔥 KOTAK TUMPUL PREMIUM LOG CHAT MASUK
        if (pesanTeks !== '') {
            // Pangkas semua embel-embel aneh dari JID Baileys
            const targetChat = from.split('@')[0].split(':')[0];
            const timeNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            
            console.log(`\n\x1b[38;5;183m╭────────────────────────────────────────────────────────╮\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;51m✨ [INCOMING TRANSMISSION]\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;213m📅 Tanggal/Jam  :\x1b[0m \x1b[38;5;253m${timeNow}\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;159m👤 Pengirim     :\x1b[0m \x1b[38;5;253m${pushname} (${nomorRapi})\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;220m🏠 Ruang Chat   :\x1b[0m \x1b[38;5;253m+${targetChat}\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;111m🏓 Tipe Pesan   :\x1b[0m \x1b[38;5;253m${type.replace('Message', '')}\x1b[0m`);
            console.log(`\x1b[38;5;183m│\x1b[0m \x1b[38;5;225m💬 Pesan Chat   :\x1b[0m \x1b[38;5;253m${pesanTeks.substring(0, 45)}${pesanTeks.length > 45 ? '...' : ''}\x1b[0m`);
            console.log(`\x1b[38;5;183m╰────────────────────────────────────────────────────────╯\x1b[0m`);
        }


                // 1. Fungsi Reply Normal Anti-Ghosting + FAKE QUOTED WHATSAPP (CENTANG BIRU)
        const reply = async (text) => {          
            try {
               // Manipulasi Metadata WhatsApp Verified dengan Teks ASLI Pengirim
                const fakeVerifikasiWA = {
                    key: {
                        fromMe: false,
                        participant: "0@s.whatsapp.net", // Centang Biru Mutlak 
                        remoteJid: "status@broadcast",
                        id: "3EB0" + Math.random().toString(16).substring(2, 14).toUpperCase()
                    },
                    message: realMsg // 🚀 INI KUNCINYA! Kita injeksi raw object-nya langsung
                };
                

                // 🔥 AUTO-SINKRONISASI EPHEMERAL BIAR GAK DI-GHOSTING META
                let expirationTimer = undefined;
                if (msg.message?.ephemeralMessage?.messageContextInfo?.expiration) {
                    expirationTimer = msg.message.ephemeralMessage.messageContextInfo.expiration;
                } else if (msg.message?.ephemeralMessage) {
                    expirationTimer = 86400; // Injeksi timer default 24 jam
                }

                let payloadPesan = { 
                    text: text,
                    // 🔥 LABEL AI EKSKLUSIF META WAJIB ADA
                    contextInfo: {
                        isForwarded: false, 
                        isAiGenerated: true 
                    }
                };
                
                // PROTEKSI GHAIB: Jangan masukin ephemeralExpiration ke payload kalau nilainya undefined!
                if (expirationTimer) {
                    payloadPesan.ephemeralExpiration = expirationTimer;
                }
                const sendMsg = await sock.sendMessage(from, payloadPesan, { quoted: fakeVerifikasiWA });
                
                console.log(`\x1b[38;5;82m[DISPATCH SUCCESS]\x1b[0m Pesan meluncur ke jaringan WA: ${from.split('@')[0]}`);
                return sendMsg;
            } catch (err) {
                console.log(`\x1b[38;5;226m[WARNING]\x1b[0m Quoted reply gagal, mencoba kirim tanpa quote...`);
                const fallbackMsg = await sock.sendMessage(from, { text: text });
                console.log(`\x1b[38;5;82m[DISPATCH SUCCESS]\x1b[0m Pesan fallback meluncur ke: ${from.split('@')[0]}`);
                return fallbackMsg;
            }
        };



        // =========================================================================
        // 🚫 DAFTAR BANNED (TERMASUK ABANG LU)
        // =========================================================================
        const hardBannedList = ["6289647369075","6289666046050","6289653405715","6289656337825","6282295187265","6282125254158","6288210392590","62895393706910","6285129449240","6285813943453","6285777604598","62895338858682","6285775230869","6285894444173","6285282593465","62895416002767","62895402208265","6281632100058","6289501502983","622127937262","622150857500","1500445","6285133485801","6285811073595","6288214101299","6287794963956","6282355156336","6289501982464","62895322501138","6289673685859","62895391790601","6281389354063","6289509781250","6287785837479","62895338097405","62895322540794","6285213533313","6289636432550","6281315557530","6289601970928","62895424040084","6287750310823","628972120517","6285218244039","6288809228876","6281315512649","6281387418241","628990464427","62895338155978","6285211594349","6282188608886","6285782046317","6288808940313","6282121012045","6281285036404","6281540090423","6285700581284"];
        if (hardBannedList.includes(pengirimRaw) && !msg.key.fromMe) {
            console.log(`\n\x1b[38;5;196m╭────────────────────────────────────────────────────────╮\x1b[0m`);
            console.log(`\x1b[38;5;196m│ [DITOLAK] MENGABAIKAN PESAN DARI PENGGUNA TERLARANG    │\x1b[0m`);
            console.log(`\x1b[38;5;196m│ NOMOR : +${pengirimRaw.padEnd(43, ' ')}│\x1b[0m`);
            console.log(`\x1b[38;5;196m╰────────────────────────────────────────────────────────╯\x1b[0m\n`);
            return;
        }

        // =========================================================================
        // 🔒 KONTROL MUTE INTERAKTIF (PUBLIK + TOMBOL NATIVE FLOW)
        // =========================================================================
        global.lastActionTime = global.lastActionTime || {};

        // Deteksi command normal ATAU teks dari pencetan tombol
        const isMuteCmd = bodyTrimmed.startsWith('/mute') || bodyTrimmed.startsWith('.mute') || bodyTrimmed.startsWith('!mute') || bodyTrimmed === 'nonaktifkan respon ai';
        const isUnmuteCmd = bodyTrimmed.startsWith('/unmute') || bodyTrimmed.startsWith('.unmute') || bodyTrimmed.startsWith('!unmute') || bodyTrimmed === 'aktifkan respon ai';

        if (isMuteCmd || isUnmuteCmd) {
            // HAPUS KUNCI FROM_ME! SEKARANG SIAPAPUN BISA AKSES!

            const timeOptions = { timeZone: 'Asia/Jakarta', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const currentTime = new Date().toLocaleString('id-ID', timeOptions) + ' WIB';                    
            let targetMute = from; 
            const splitCmd = bodyTrimmed.split(' ');
            
            if (splitCmd.length > 1 && splitCmd[0].includes('mute')) {               
                let nomorTarget = splitCmd[1].replace(/[^0-9]/g, '');
                if (nomorTarget.startsWith('0')) nomorTarget = '62' + nomorTarget.slice(1);
                if (nomorTarget.startsWith('8')) nomorTarget = '62' + nomorTarget;
                if (nomorTarget) targetMute = nomorTarget + '@s.whatsapp.net';
            }

            let statusText = "";

            if (isMuteCmd) {
                if (aiMutedChats[targetMute]) {
                    const lastTime = global.lastActionTime[targetMute] || "Belum diketahui";
                    statusText = `*STATUS NONAKTIF*\n\nRespon AI memang sudah dimatikan untuk obrolan ini.\nTerakhir diubah: ${lastTime}`;
                } else {
                    aiMutedChats[targetMute] = true;
                    global.lastActionTime[targetMute] = currentTime;
                    delete userHistory[targetMute]; 
                    statusText = `Respon AI berhasil dimatikan untuk obrolan ini.`;
                }
            } else if (isUnmuteCmd) {
                if (!aiMutedChats[targetMute]) {
                    const lastTime = global.lastActionTime[targetMute] || "Belum pernah dimatikan";
                    statusText = `*STATUS AKTIF*\n\nRespon AI memang sudah menyala untuk obrolan ini.\nTerakhir diubah: ${lastTime}`;
                } else {
                    delete aiMutedChats[targetMute];
                    global.lastActionTime[targetMute] = currentTime;
                    statusText = `Respon AI berhasil diaktifkan kembali untuk obrolan ini.`;
                }
            }

            // RAKIT TOMBOL INTERAKTIF VERIFIED
            const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
            let buttons = [
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Aktifkan Respon AI", id: "btn_unmute" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Matikan Respon AI", id: "btn_mute" }) }
            ];

            const fakeVerifikasiWA_Mute = {
                key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast", id: "3EB0" + Math.random().toString(16).substring(2, 14).toUpperCase() },
                message: realMsg 
            };

            let msgNode = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: statusText }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: " 亗 VGen AI System" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "", subtitle: "", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: buttons }),
                            contextInfo: { isForwarded: false, isAiGenerated: true } 
                        })
                    }
                }
            }, { userJid: sock.user.id, quoted: fakeVerifikasiWA_Mute }); 
            
            await sock.relayMessage(from, msgNode.message, { messageId: msgNode.key.id });
            return; 
        }

        // =========================================================================
        // 🛡️ FILTER ABSOLUT (ALL-ACCESS TAPI AMAN DARI BANNED)
        // =========================================================================   
        const cleanPengirim = String(pengirimRaw).trim();
        const isLID = from.includes('@lid') || (msg.key.participant && msg.key.participant.includes('@lid'));
        if (!isLID && !cleanPengirim.startsWith('62') && !msg.key.fromMe) {
            console.log(`\n\x1b[38;5;196m╭────────────────────────────────────────────────────────╮\x1b[0m`);
            console.log(`\x1b[38;5;196m│ [DITOLAK] NOMOR LUAR NEGERI ASLI DIBLOKIR MUTLAK       │\x1b[0m`);
            console.log(`\x1b[38;5;196m│ NOMOR : +${cleanPengirim.padEnd(43, ' ')}│\x1b[0m`);
            console.log(`\x1b[38;5;196m╰────────────────────────────────────────────────────────╯\x1b[0m\n`);
            return;
        }
        
        // 🔴🗑️ FITUR VIP SUDAH DIBUANG TOTAL SESUAI INSTRUKSI!

        // 2. KONTROL MUTE MUTLAK: Kalo obrolan lagi di-mute (/mute), AI BERHENTI RESPON BUAT SIAPAPUN! 
        // Obrolan cuma dilepasin kalau ada yang ngetik command (kayak /unmute)
        if (aiMutedChats[from] && !isCmd) return;
        
        // 🛡️ [SYSTEM INJECTION] ANTI-SPAM BRUTAL (RATE LIMITER META-SAFE)
        global.spamData = global.spamData || {};
        const waktuSekarang = Date.now();
        if (global.spamData[from]) {
            const selisihWaktu = waktuSekarang - global.spamData[from];
            // Kalo ada pesan masuk lagi padahal belum 3 detik dari pesan sebelumnya:
            if (selisihWaktu < 3000) { 
                console.log(`\x1b[38;5;208m[ANTI-SPAM]\x1b[0m Memblokir spam bar-bar dari ${pushname}. Hemat limit!`);
                return;
            }
        }
        global.spamData[from] = waktuSekarang; // Catat waktu pesan terakhir orang ini

        if (!userHistory[from]) userHistory[from] = [];


        // =========================================================================
        // 🧠 AI HYBRID CORE 
        // =========================================================================
        let finalPrompt = pesanTeks.trim();
        let base64Media = null; 
        let mimeTypeMedia = null;

        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
        let quotedMediaMsg = null;
        
        if (quotedMsg) {
            const quotedKeys = Object.keys(quotedMsg.quotedMessage || {});
            const hasQuotedMedia = quotedKeys.some(k => ['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage'].includes(k));
            
            if (hasQuotedMedia) quotedMediaMsg = quotedMsg.quotedMessage; 
            const quotedText = quotedMsg.quotedMessage?.conversation || quotedMsg.quotedMessage?.extendedTextMessage?.text;
            if (quotedText) finalPrompt = `[Konteks reply: "${quotedText}"]\n\nRespon untuk: ${finalPrompt}`;
        }

        if ((hasMedia || quotedMediaMsg) && finalPrompt === "") {
            finalPrompt = "[Sistem: Pengguna mengirimkan media/lampiran]";
        }
        
            // 🎙️ Handle Voice Note: BIKIN DIEM BIAR HEMAT LIMIT
        if (isAudio) {
            console.log(`\x1b[38;5;226m[INFO]\x1b[0m Voice Note terdeteksi. Mengabaikan VN agar hemat limit AI.`);
            return; 
        }

           if (finalPrompt !== "" || hasMedia || quotedMediaMsg) {
            if (!activeApiKey) return reply("Api key belum terhubung");
            
            await sock.sendPresenceUpdate('composing', from);          
            try {
                let aiResponse = "";
                let targetMsg = hasMedia ? realMsg[type] : (quotedMediaMsg ? quotedMediaMsg[Object.keys(quotedMediaMsg)[0]] : null);
                
                                if (targetMsg && (type === 'imageMessage' || quotedMediaMsg?.imageMessage || type === 'stickerMessage' || quotedMediaMsg?.stickerMessage || type === 'documentMessage')) {
                    let mediaType = 'document';
                    if (type === 'imageMessage' || quotedMediaMsg?.imageMessage) mediaType = 'image';
                    if (type === 'stickerMessage' || quotedMediaMsg?.stickerMessage) mediaType = 'sticker';

                    const buffer = await downloadMediaBaileys(targetMsg, mediaType);
                    
                    if (buffer) {
                        base64Media = buffer.toString('base64');
                        let fileName = 'File';
                        
                        if (mediaType === 'sticker') {
                            mimeTypeMedia = 'image/webp';
                            finalPrompt = `[Sistem: Pengguna mengirim Stiker. BACA TAPI JANGAN DIRESPON untuk hemat limit, KECUALI stikernya adalah meme lucu yang nyambung dengan obrolan!]\n\nPesan: ${finalPrompt}`;
                        }
                        else if (mediaType === 'document') {
                            mimeTypeMedia = targetMsg.mimetype || 'application/pdf';
                            fileName = targetMsg.fileName || 'Dokumen';
                            if (mimeTypeMedia.includes('text') || mimeTypeMedia.includes('json') || mimeTypeMedia.includes('javascript') || fileName.endsWith('.js') || fileName.endsWith('.json') || fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.html') || fileName.endsWith('.py')) {
                                let isiTeks = buffer.toString('utf-8').substring(0, 5000);
                                base64Media = null; // Hapus base64, ubah jadi teks murni
                                finalPrompt = `[Sistem: Pengguna mengirim dokumen "${fileName}"]\nIsi Dokumen:\n\`\`\`\n${isiTeks}\n\`\`\`\n\nPesan: ${finalPrompt}`;
                            } else {
                                if (mimeTypeMedia === 'application/octet-stream' || fileName.endsWith('.dat') || fileName.endsWith('.bin') || fileName.endsWith('.apk')) {
                                    base64Media = null; 
                                    finalPrompt = `[Sistem: Pengguna mengirim file "${fileName}". KAMU BISA MEMBACA DOKUMEN TAPI TIDAK BISA melihat isinya karena format sistem/biner apk/dat. Tolak dengan jujur dan jelaskan alasannya!] ${finalPrompt}`;
                                } else {
                                    finalPrompt = `[Sistem: Pengguna mengirim lampiran dokumen "${fileName}"] Analisa ini: ${finalPrompt}`;
                                }
                            }
                        }
                        else {
                            mimeTypeMedia = targetMsg.mimetype || 'image/jpeg';
                            finalPrompt = `[Sistem: Pengguna mengirim Gambar] Analisa ini: ${finalPrompt}`;
                        }                       

                        const path = require('path');
                        const folderRiwayat = path.join(__dirname, 'riwayat_media');
                        if (!fs.existsSync(folderRiwayat)) fs.mkdirSync(folderRiwayat, { recursive: true });

                        let ekstensi = '.bin';
                        if (mediaType === 'image') ekstensi = '.jpg';
                        if (mediaType === 'sticker') ekstensi = '.webp';
                        if (mediaType === 'document') ekstensi = '.pdf'; 

                        const namaFile = `Media_${pengirimRaw}_${Date.now()}${ekstensi}`;
                        fs.writeFileSync(path.join(folderRiwayat, namaFile), buffer);
                    }
                }

                 if (activeProvider === 'OPENAI') {
                    let finalUserContent = finalPrompt;
                    if (base64Media) {
                        finalUserContent = [
                            { type: "text", text: finalPrompt },
                            { type: "image_url", image_url: { url: `data:${mimeTypeMedia || 'image/jpeg'};base64,${base64Media}` } }
                        ];
                    }

                    const openAiMessages = [
                        { role: "system", content: vgenPrompt },
                        ...userHistory[from].map(h => ({ role: h.role, content: h.content })),
                        { role: "user", content: finalUserContent }
                    ];
                    const targetEndpoint = db.apiConfig?.baseUrl || 'https://api.openai.com/v1/chat/completions';
                    const res = await fetch(targetEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeApiKey}` },
                        body: JSON.stringify({ model: activeModel, messages: openAiMessages })
                    });
                    const data = await res.json();
                    
                    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
                    if (data.choices && data.choices.length > 0) aiResponse = data.choices[0].message.content;
                }
                else if (activeProvider === 'GEMINI') {
                    let geminiContents = userHistory[from].map(h => ({
                        role: h.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: h.content }]
                    }));
                    
                    let currentParts = [{ text: finalPrompt }];
                    if (base64Media) currentParts.push({ inline_data: { mime_type: mimeTypeMedia || "image/jpeg", data: base64Media } });
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
                        let rawResponse = aiResponse.trim();
                        
                        if (aiMutedChats[from]) {
                            console.log(`\x1b[38;5;226m[INFO]\x1b[0m AI selesai mikir, tapi keburu di-mute. Pesan dibuang!`);
                            return; 
                        }                  
                        
                        // 🚀 KIRIM PAKE REPLY BIASA (CENTANG BIRU AMAN 1000%)
                        await reply(rawResponse);                    

                        // 🔥 KOTAK TUMPUL PREMIUM LOG BALASAN AI
                        const responPotong = rawResponse.replace(/\n/g, ' ').length > 50 ? rawResponse.replace(/\n/g, ' ').substring(0, 50) + '...' : rawResponse.replace(/\n/g, ' ');
                        console.log(`\x1b[38;5;201m╭────────────────────────────────────────────────────────╮\x1b[0m`);
                        console.log(`\x1b[38;5;201m│\x1b[0m \x1b[38;5;195m🤖 VGen Reply  :\x1b[0m \x1b[38;5;253m${responPotong}\x1b[0m`);
                        console.log(`\x1b[38;5;201m╰────────────────────────────────────────────────────────╯\x1b[0m\n`);

                        if (!userHistory[from]) userHistory[from] = [];
                        userHistory[from].push({ role: 'user', content: finalPrompt });
                        userHistory[from].push({ role: 'assistant', content: rawResponse });
                        if (userHistory[from].length > MAX_HISTORY) userHistory[from] = userHistory[from].slice(-MAX_HISTORY);
                    }

              } catch (error) {
                const realError = error.message.replace(/\n/g, ' ');
                console.log(`\n\x1b[38;5;196m╭────────────────────────────────────────────────────────╮\x1b[0m`);
                console.log(`\x1b[38;5;196m│\x1b[0m \x1b[38;5;226m❌ AI Core Error :\x1b[0m \x1b[38;5;253m${realError.substring(0,80)}\x1b[0m`);
                console.log(`\x1b[38;5;196m╰────────────────────────────────────────────────────────╯\x1b[0m\n`);             
                await reply(`⚠️ *VGen Engine Terkendala*\n\nTerjadi penolakan dari server pusat.\n*Detail Error:* ${realError}\n\n_Sistem perlindungan diaktifkan. Mohon hubungi developer._`);
            } finally {

                await sock.sendPresenceUpdate('paused', from);
            }
        }
    });
} 

// =========================================================================
// 🌐 TABEL PREMIUM DEPLOYMENT SERVER 
// =========================================================================
app.post('/deploy-key', (req, res) => {
    const { apiKey, provider, model } = req.body;
    if (!apiKey || !model) return res.status(400).json({ error: "API Key atau Model tidak boleh kosong!" });
    
    activeApiKey = apiKey;
    activeProvider = provider ? provider.toUpperCase() : "OPENAI"; 
    activeModel = model;

    db.apiConfig = { apiKey: activeApiKey, provider: activeProvider, model: activeModel };
    saveDb();

    // 🔥 TABEL MEMBULAT ELEGAN SAAT API AKTIF (40 WARNA TERFOKUS)
    const deployTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`\n\x1b[38;5;141m╭──────────────────────────────────────────────────────────╮\x1b[0m`);
    console.log(`\x1b[38;5;141m│\x1b[0m \x1b[38;5;226m🚀 SYSTEM OVERRIDE: VGEN AI ENGINE DEPLOYED\x1b[0m              \x1b[38;5;141m│\x1b[0m`);
    console.log(`\x1b[38;5;141m├──────────────────────────────────────────────────────────┤\x1b[0m`);
    console.log(`\x1b[38;5;141m│\x1b[0m \x1b[38;5;219m🗓️  Date & Time :\x1b[0m \x1b[38;5;253m${deployTime.padEnd(38, ' ')}\x1b[38;5;141m│\x1b[0m`);
    console.log(`\x1b[38;5;141m│\x1b[0m \x1b[38;5;153m🧠 Provider    :\x1b[0m \x1b[38;5;253m${activeProvider.padEnd(38, ' ')}\x1b[38;5;141m│\x1b[0m`);
    console.log(`\x1b[38;5;141m│\x1b[0m \x1b[38;5;117m📌  Model Core  :\x1b[0m \x1b[38;5;253m${activeModel.padEnd(38, ' ')}\x1b[38;5;141m│\x1b[0m`);
    console.log(`\x1b[38;5;141m│\x1b[0m \x1b[38;5;85m✅ Status      :\x1b[0m \x1b[38;5;253m${"ONLINE & VERIFIED".padEnd(38, ' ')}\x1b[38;5;141m│\x1b[0m`);
    console.log(`\x1b[38;5;141m╰──────────────────────────────────────────────────────────╯\x1b[0m\n`);

    res.json({ success: true, message: `Sukses terhubung ke model: ${activeModel}` });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[38;5;82m✅ [ VGEN AI API CLOUD ONLINE DI PORT ${PORT} ]\x1b[0m`);
});


startBot();
