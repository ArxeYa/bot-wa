const { Client, LocalAuth, Buttons, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const colors = require('colors');
const fs = require('fs');
const { EditPhotoHandler } = require('./feature/edit_foto');
const { ChatAIHandler } = require('./feature/chat_ai');
const ytdl = require('ytdl-core');


const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
    },
    authStrategy: new LocalAuth({ clientId: "client" })
});
const config = require('./config/config.json');

client.on('qr', (qr) => {
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Scan the QR below : `);
    qrcode.generate(qr, { small: true });
});
 
client.on('ready', () => {
    console.clear();
    const consoleText = './config/console.txt';
    fs.readFile(consoleText, 'utf-8', (err, data) => {
        if (err) {
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Console Text not found!`.yellow);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        } else {
            console.log(data.green);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        }
    })
});

client.on('message', async msg => {

    const text = msg.body.toLowerCase() || '';

    //check status
    if (text === '!ping') {
        msg.reply('pong');
    }

    // edit_bg/bg_color
    if (text.includes("#edit_bg/")) {
        await EditPhotoHandler(text, msg);
    }
    // #ask/question?
    if (text.includes("#ask/")) {
        await ChatAIHandler(text, msg);
    }

});


// stiker
client.on('message', async (message) => {
    if (message.type == "image" && message.body == "#stiker") {
        client.sendMessage(message.from, "*[⏳]* Loading..");
        try {
            const media = await message.downloadMedia();
            client.sendMessage(message.from, media, {
                sendMediaAsSticker: true,
                stickerName: config.name, // Sticker Name = Edit in 'config/config.json'
                stickerAuthor:"Kefo" // Sticker Author = Your Whatsapp BOT Number
            }).then(() => {
                client.sendMessage(message.from, "*[✅]* Successfully!");
            });
        } catch {
            client.sendMessage(message.from, "*[❎]* Failed!");
        }
    } else if (message.type == "sticker") {
        client.sendMessage(message.from, "*[⏳]* Loading..");
        try {
            const media = await message.downloadMedia();
            client.sendMessage(message.from, media).then(() => {
                client.sendMessage(message.from, "*[✅]* Successfully!");
            });  
        } catch {
            client.sendMessage(message.from, "*[❎]* Failed!");
        }
    } else {
        client.getChatById(message.id.remote).then(async (chat) => {
            await chat.sendSeen();
        });
    }  
});

// youtube download
let data;
client.on('message', async (message) => {
    let url = message.body;
    let chatId = message.from;
    let isGroups = message.from.endsWith('@g.us') ? true : false;
    if ((isGroups && config.groups) || !isGroups) {
        if (ytdl.validateURL(url)) {
            let button = new Buttons(`Want to download as *Audio* or *Video* ?`,[{ id: 'mp3', body: 'Audio - MP3' }, { id: 'mp4', body: 'Video - MP4' }]);
            data = url;
            await client.sendMessage(chatId, button);
        } else {
            if (message.type == 'buttons_response') {
                const { selectedButtonId: buttonid } = message;
                if (buttonid == 'mp3' && !data == '') {
                    client.sendMessage(chatId, '[⏳] Loading..');
                    try {
                        ytdl(data, { filter: 'audioonly', format: 'mp3', quality: 'highest' }).pipe(fs.createWriteStream(`./database/download.mp3`)).on('finish', async () => {
                            const media = await MessageMedia.fromFilePath("./database/download.mp3");
                            media.filename = `${config.filename.mp3}.mp3`;
                            await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
                            client.sendMessage(chatId, '*[✅]* Success!');
                        });
                    } catch {
                        client.sendMessage(chatId, '*[❎]* Failed!')
                    }
                } else if (buttonid == 'mp4' && !data == '') {
                    client.sendMessage(chatId, '[⏳] Loading..');
                    try {
                        ytdl(data, { filter: 'audioandvideo', format: 'mp4', quality: 'highest' }).pipe(fs.createWriteStream(`./database/download.mp4`)).on('finish', async () => {
                            const media = MessageMedia.fromFilePath("./database/download.mp4");
                            media.filename = `${config.filename.mp4}.mp4`;
                            await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
                            client.sendMessage(chatId, '*[✅]* Success!');
                        });
                    } catch {
                        client.sendMessage(chatId, '*[❎]* Failed!');
                    }
                }
            }
        }
    }
});

client.initialize();
