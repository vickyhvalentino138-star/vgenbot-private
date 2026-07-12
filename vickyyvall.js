/**
 * =========================================================================
 * ★ VGEN GHOST TERMINAL (HANTU ONLINE EDITION) ★
 * =========================================================================
*/

const pino = require('pino');
const util = require('util');

const hapusLogSampah = (args) => {
    const text = util.format(...args);
    if (text.includes('Closing open session') || text.includes('SessionEntry') || text.includes('prekey bundle') || text.includes('_chains') || text.includes('Bad MAC') || text.includes('Session error')) return true;
    return false;
};

const originalLog = console.log;
console.log = function(...args) { if (!hapusLogSampah(args)) originalLog.apply(console, args); };

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

let sock; 
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('vgen_session');
    const { version } = await fetchLatestBaileysVersion(); 

    sock = makeWASocket({
        version, 
        auth: state,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        browser: ['VGen Ghost Ultimate', 'Chrome', '2.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    // FUNGSI RAHASIA: PAKSA KIRIM FOTO HD TANPA JADI DOKUMEN!
    const kirimFotoHD = async (jid, bufferGambar, teksCaption = "") => {
        try {
            await sock.sendMessage(jid, { 
                image: bufferGambar, 
                caption: teksCaption,
                mimetype: 'image/png' // TRIK BYPASS KOMPRESI WA
            });
            console.log(`\x1b[38;5;82m[SUCCESS]\x1b[0m Foto HD berhasil dikirim ke: ${jid.split('@')[0]}`);
        } catch (err) {
            console.log(`\x1b[38;5;196m[ERROR]\x1b[0m Gagal kirim foto HD: ${err}`);
        }
    };

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; 
        
        if (connection === 'connecting') {
            console.log('\x1b[38;5;213m⏳ Menghubungkan Ghost Engine ke Server WhatsApp...\x1b[0m');
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
            
            console.log(`\n\x1b[1m\x1b[38;5;196m  ╭\x1b[38;5;196m─\x1b[38;5;202m─\x1b[38;5;208m─\x1b[38;5;214m─\x1b[38;5;220m─\x1b[38;5;226m─\x1b[38;5;190m─\x1b[38;5;154m─\x1b[38;5;118m─\x1b[38;5;82m─\x1b[38;5;46m─\x1b[38;5;47m─\x1b[38;5;48m─\x1b[38;5;49m─\x1b[38;5;50m─\x1b[38;5;51m─\x1b[38;5;45m─\x1b[38;5;39m─\x1b[38;5;33m─\x1b[38;5;27m─\x1b[38;5;21m─\x1b[38;5;57m─\x1b[38;5;93m─\x1b[38;5;129m─\x1b[38;5;165m─\x1b[38;5;201m─\x1b[38;5;200m─\x1b[38;5;199m─\x1b[38;5;198m─\x1b[38;5;197m─\x1b[38;5;196m─\x1b[38;5;202m─\x1b[38;5;208m─\x1b[38;5;214m─\x1b[38;5;220m─\x1b[38;5;226m─\x1b[38;5;154m─\x1b[38;5;82m─\x1b[38;5;46m─\x1b[38;5;50m─\x1b[38;5;51m─\x1b[38;5;39m─\x1b[38;5;27m─\x1b[38;5;93m─\x1b[38;5;129m─\x1b[38;5;165m─\x1b[38;5;201m─\x1b[38;5;198m─\x1b[38;5;161m─\x1b[38;5;124m─\x1b[38;5;88m╮\x1b[0m
\x1b[1m\x1b[38;5;198m  │\x1b[0m   \x1b[38;5;51m██╗   ██╗\x1b[0m \x1b[38;5;135m██████╗\x1b[0m \x1b[38;5;205m███████╗\x1b[0m\x1b[38;5;226m███╗   ██╗\x1b[0m     \x1b[38;5;46m█████╗\x1b[0m \x1b[38;5;208m██╗\x1b[0m  \x1b[1m\x1b[38;5;198m│\x1b[0m
\x1b[1m\x1b[38;5;205m  │\x1b[0m   \x1b[38;5;45m██║   ██║\x1b[0m\x1b[38;5;141m██╔════╝\x1b[0m \x1b[38;5;198m██╔════╝\x1b[0m\x1b[38;5;220m████╗  ██║\x1b[0m    \x1b[38;5;47m██╔══██╗\x1b[0m\x1b[38;5;214m██║\x1b[0m  \x1b[1m\x1b[38;5;205m│\x1b[0m
\x1b[1m\x1b[38;5;213m  │\x1b[0m   \x1b[38;5;39m██║   ██║\x1b[0m\x1b[38;5;99m██║  ███╗\x1b[0m\x1b[38;5;162m█████╗  \x1b[0m\x1b[38;5;214m██╔██╗ ██║\x1b[0m    \x1b[38;5;48m███████║\x1b[0m\x1b[38;5;202m██║\x1b[0m  \x1b[1m\x1b[38;5;213m│\x1b[0m
\x1b[1m\x1b[38;5;135m  │\x1b[0m   \x1b[38;5;33m╚██╗ ██╔╝\x1b[0m\x1b[38;5;93m██║   ██║\x1b[0m\x1b[38;5;126m██╔══╝  \x1b[0m\x1b[38;5;208m██║╚██╗██║\x1b[0m    \x1b[38;5;49m██╔══██║\x1b[0m\x1b[38;5;196m██║\x1b[0m  \x1b[1m\x1b[38;5;135m│\x1b[0m
\x1b[1m\x1b[38;5;99m  │\x1b[0m    \x1b[38;5;27m╚████╔╝ \x1b[0m\x1b[38;5;57m╚██████╔╝\x1b[0m\x1b[38;5;89m███████╗\x1b[0m\x1b[38;5;202m██║ ╚████║\x1b[0m    \x1b[38;5;50m██║  ██║\x1b[0m\x1b[38;5;160m██║\x1b[0m  \x1b[1m\x1b[38;5;99m│\x1b[0m
\x1b[1m\x1b[38;5;51m  │\x1b[0m     \x1b[38;5;21m╚═══╝\x1b[0m   \x1b[38;5;17m╚═════╝\x1b[0m \x1b[38;5;53m╚══════╝\x1b[0m\x1b[38;5;196m╚═╝  ╚═══╝\x1b[0m    \x1b[38;5;42m╚═╝  ╚═╝\x1b[0m\x1b[38;5;124m╚═╝\x1b[0m  \x1b[1m\x1b[38;5;51m│\x1b[0m
\x1b[1m\x1b[38;5;124m  ╰\x1b[38;5;124m─\x1b[38;5;161m─\x1b[38;5;198m─\x1b[38;5;201m─\x1b[38;5;165m─\x1b[38;5;129m─\x1b[38;5;93m─\x1b[38;5;27m─\x1b[38;5;39m─\x1b[38;5;51m─\x1b[38;5;50m─\x1b[38;5;46m─\x1b[38;5;82m─\x1b[38;5;154m─\x1b[38;5;226m─\x1b[38;5;220m─\x1b[38;5;214m─\x1b[38;5;208m─\x1b[38;5;202m─\x1b[38;5;196m─\x1b[38;5;197m─\x1b[38;5;198m─\x1b[38;5;199m─\x1b[38;5;200m─\x1b[38;5;201m─\x1b[38;5;165m─\x1b[38;5;129m─\x1b[38;5;93m─\x1b[38;5;57m─\x1b[38;5;21m─\x1b[38;5;27m─\x1b[38;5;33m─\x1b[38;5;39m─\x1b[38;5;45m─\x1b[38;5;51m─\x1b[38;5;50m─\x1b[38;5;49m─\x1b[38;5;48m─\x1b[38;5;47m─\x1b[38;5;46m─\x1b[38;5;82m─\x1b[38;5;118m─\x1b[38;5;154m─\x1b[38;5;190m─\x1b[38;5;226m─\x1b[38;5;220m─\x1b[38;5;214m─\x1b[38;5;208m─\x1b[38;5;202m─\x1b[38;5;196m─\x1b[38;5;196m╯\x1b[0m`);
            
            console.log(`     \x1b[1m\x1b[38;5;196m✦\x1b[38;5;202m \x1b[38;5;208mG\x1b[38;5;214mH\x1b[38;5;220mO\x1b[38;5;226mS\x1b[38;5;190mT\x1b[38;5;154m \x1b[38;5;118mM\x1b[38;5;82mO\x1b[38;5;46mD\x1b[38;5;47mE\x1b[38;5;48m \x1b[38;5;49mA\x1b[38;5;50mC\x1b[38;5;51mT\x1b[38;5;45mI\x1b[38;5;39mV\x1b[38;5;33mE\x1b[38;5;27m \x1b[38;5;88m✦\x1b[0m \x1b[1m\x1b[38;5;82m[\x1b[38;5;118m S\x1b[38;5;154mY\x1b[38;5;190mS\x1b[38;5;226mT\x1b[38;5;220mE\x1b[38;5;214mM\x1b[38;5;208m \x1b[38;5;202mO\x1b[38;5;196mN\x1b[38;5;160mL\x1b[38;5;124mI\x1b[38;5;88mN\x1b[38;5;124mE\x1b[38;5;88m ]\x1b[0m\n`);
        }
   });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' && m.type !== 'append') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us') || from === 'status@broadcast' || msg.key.fromMe) return; 

        const durasiMerekam = Math.floor((Math.abs(Math.sin(Date.now())) * 20) + 10) * 1000;
        
        await sock.sendPresenceUpdate('recording', from);
        console.log(`\x1b[38;5;51m[GHOST ACTIVITY]\x1b[0m Pura-pura ngerekam VN ke: ${from.split('@')[0]} selama ${durasiMerekam/1000} detik 👻`);

        setTimeout(async () => { 
            await sock.sendPresenceUpdate('paused', from);
        }, durasiMerekam);
    });
} 

startBot();
