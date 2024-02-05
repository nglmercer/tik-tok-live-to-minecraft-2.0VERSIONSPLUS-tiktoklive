// Cambios en los imports y otras correcciones
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import winston from 'winston';
import mineflayer from 'mineflayer';

const keyplayerName = 'melser';
const keyBOT = 'melsernglBOT';
const keySERVER = '127.0.0.1';
const keySERVERPORT = '25565';
const app = express();

let bot;
let isConnected = false; // Bandera para controlar la conexión

function createBot() {
    if (!isConnected) {
        bot = mineflayer.createBot({
            host: `${keySERVER}`,
            username: `${keyBOT}`,
            port: `${keySERVERPORT}`,
        });
        isConnected = true;
    if (isConnected) {
        bot.on('error', (err) => {
            console.log('Error:', err);
        });

        bot.on('end', () => {
            console.log('Bot desconectado. Intentando reconexión...');
            checkAndReconnect('end');
        });
        bot.once('spawn', () => {
            console.log('Reconectado');
            isConnected = true;
            bot.chat('/say hello');
        });
    }
    }
}

function checkAndReconnect(errorType) {
    console.log(`Handling ${errorType} error...`);
    if (isConnected) {
        console.log("conectado!");
    }
    if (errorType === 'error' || errorType === 'end') {
        // Verificar si está desconectado
        if (!bot || !bot.session|| !isConnected) {
            console.log('Bot está desconectado. Intentando reconexión...');
            bot = null; // Limpiar instancia actual
            isConnected = false; // Marcar como desconectado

            // Puedes agregar más lógica aquí antes de intentar reconectar, si es necesario.

            // Intentar reconectar llamando a createBot().
            createBot();
        } else {
            console.log('Bot está conectado. No es necesario reconectar.');
        }
    } else {
        console.log(`ErrorType ${errorType} no reconocido.`);
    }
}

createBot(); // Inicia el bot al principio

const playerNames = [`${keyplayerName}`, `${keyplayerName}`];
let currentPlayerIndex = 0;

// Variables para almacenar los datos de los archivos
let keywords = null;
let commandList = null;

const consoleTransport = new winston.transports.Console({
    format: winston.format.simple()
});
const logger = winston.createLogger({
    transports: [consoleTransport]
});

// Leer los archivos al inicio del script
fs.readFile('keywords.json', 'utf8', (err, data) => {
    if (err) throw err;
    keywords = JSON.parse(data);
});

fs.readFile('commandList.json', 'utf8', (err, data) => {
    if (err) throw err;
    commandList = JSON.parse(data);
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ message: 'Servidor en funcionamiento' });
});

app.post('/api/receive', (req, res) => {
    const { eventType, data, msg, color, message } = req.body;
    if (!msg || !data) {
        res.status(400).json({ message: 'Faltan datos en la solicitud' });
        return;
    }

    switch (eventType) {
        case 'chat':
            handleChat(data, msg);
            break;
        case 'gift':
            handleGift(data, msg);
            break;
        case 'social':
            handleSocial(data, msg, color, message);
            break;
        case 'welcome':
            handleWelcome(data, msg, color, message);
            break;
        case 'likes':
            handleLikes(data, msg);
            break;
        case 'streamEnd':
            handleStreamEnd(data, message);
            break;
        default:
            logger.info(`Evento desconocido: ${eventType}`);
    }

    res.json({ message: 'Datos recibidos' });
});

let lastCommand = null;
let lastWelcome = null;

function handleChat(data, msg) {
    if (data && data.comment) {
        logger.info(`${data.uniqueId} : ${data.comment}`);
        handleEvent('chat', data);
    }
}

function handleGift(data, msg) {
    if (data && data.giftName) {
        let repeatCount = data.repeatCount ? data.repeatCount : 1;
        logger.info(`${data.uniqueId} Gift: ${data.giftName}, Repetitions: ${repeatCount}`);
        handleEvent('gift', data, `${data.uniqueId}:${data.giftName}x${repeatCount} `);
    }
}

let lastEvent = null;
let userStats = {};
let joinMsgDelay = 0;

function handleSocial(data, msg, color, message) {
    if (data.displayType.includes('follow')) {
        if (lastEvent !== 'follow' || data.uniqueId !== lastEvent.uniqueId) {
            logger.info(`${data.uniqueId} te sige`);
            handleEvent('follow', data);
            lastEvent = { eventType: 'follow', uniqueId: data.uniqueId };
        }
    } else if (data.displayType.includes('share')) {
        logger.info(`${data.uniqueId} ha compartido`);
        handleEvent('share', data);
    }
}

function handleWelcome(data, msg, color, message) {
    let addDelay = 250;
    if (joinMsgDelay > 500) addDelay = 100;
    if (joinMsgDelay > 1000) addDelay = 0;
    if (data.uniqueId === lastWelcome) {
        return;
    }
    lastWelcome = data.uniqueId
    joinMsgDelay += addDelay;
    setTimeout(() => {
        joinMsgDelay -= addDelay;
        logger.info(`${data.uniqueId} welcome`)
        handleEvent('welcome', data, message, null, msg);
        handleEvent('welcome', msg, message, null, msg);
    }, joinMsgDelay);
}

function handleLikes(data, msg) {
    if (!userStats[msg.uniqueId]) {
        userStats[msg.uniqueId] = { likes: 0, totalLikes: 0, milestone: 50 };
    }
    const milestoneLikes = `${userStats[msg.uniqueId].milestone}LIKES`;
    handleEvent('likes', `${milestoneLikes} likes`);
    logger.info(`Evento: ${milestoneLikes} likes`);
    userStats[msg.uniqueId].milestone += 50;
    if (userStats[msg.uniqueId].milestone > 300) {
        userStats[msg.uniqueId].likes = 0;
        userStats[msg.uniqueId].milestone = 50;
    }
}

function handleStreamEnd(data, message) {
    logger.info(`Evento de 'streamEnd': ${message}`);
}


function handleEvent(eventType, data, msg, likes) {
    let playerName = null;
    let eventCommands = [];

    if (playerNames[currentPlayerIndex] === undefined || playerNames[currentPlayerIndex].length < 2) {
        playerName = `${keyplayerName}`;
    } else {
        playerName = playerNames[currentPlayerIndex];
    }

    currentPlayerIndex++;
    if (currentPlayerIndex >= playerNames.length) {
        currentPlayerIndex = 0;
    }

    if (eventType === 'gift') {
        let giftName = data.giftName.trim().toLowerCase();
        let foundGift = Object.keys(commandList.gift).find(gift => gift.toLowerCase() === giftName);
        if (foundGift) {
            eventCommands = commandList.gift[foundGift];
        } else {
            eventCommands = commandList.gift['default'];
        }
    } else if (commandList[eventType]) {
        if (typeof commandList[eventType] === 'object' && !Array.isArray(commandList[eventType])) {
            if (data.likes && commandList[eventType][data.likes]) {
                eventCommands = commandList[eventType][data.likes];
            } else {
                eventCommands = commandList[eventType]['default'];
            }
        } else {
            eventCommands = commandList[eventType];
        }
    }

    if (Array.isArray(eventCommands)) {
        eventCommands.forEach(command => {
            let replacedCommand = command
                .replace('{uniqueId}', data.uniqueId || '')
                .replace('{comment}', data.comment || '')
                .replace('{milestoneLikes}', likes || '')
                .replace('{likes}', likes || '')
                .replace('{message}', data.comment || '')
                .replace('{giftName}', data.giftName || '')
                .replace('{repeatCount}', data.repeatCount || '')
                .replace('{playername}', playerName || '');

            if (eventType !== 'gift' && replacedCommand === lastCommand) {
                return;
            }

            if (data.comment && keywords.keywordToGive[data.comment.toLowerCase()]) {
                let itemKeyword = Object.keys(keywords.keywordToGive).find(keyword => data.comment.toLowerCase().includes(keyword.toLowerCase()));
                if (itemKeyword) {
                    replacedCommand = `/execute at @a run give @a ${keywords.keywordToGive[itemKeyword]}`;
                    logger.info(replacedCommand);
                }
            } else if (command.includes('item')) {}

            if (data.comment && keywords.keywordToMob[data.comment.toLowerCase()]) {
                let mobKeyword = Object.keys(keywords.keywordToMob).find(keyword => data.comment.toLowerCase().includes(keyword.toLowerCase()));
                if (mobKeyword) {
                    replacedCommand = `/execute at ${playerName} run summon ${keywords.keywordToMob[mobKeyword]}`;
                    logger.info(replacedCommand);
                }
            } else if (command.includes('mob')) {}

            let repeatCount = data.repeatCount || 1;
            for (let i = 0; i < repeatCount; i++) {
                if (isConnected) {
                    if (eventType === 'gift') {
                        setTimeout(() => {
                            bot.chat(replacedCommand);
                            console.log('comando1',replacedCommand);
                        }, 500); // Esperar 3 segundos (3000 milisegundos) antes de enviar el comando
                    } else if (replacedCommand !== lastCommand) {
                        setTimeout(() => {
                            lastCommand = replacedCommand;
                            bot.chat(replacedCommand);
                            console.log('comando2',replacedCommand);
                        }, 500); // Esperar 3 segundos (3000 milisegundos) antes de enviar el comando
                    }
                }
            }
        });
    }
}

// Inicia el servidor web
const webServerPort = 3000;
app.listen(webServerPort, () => logger.info(`Servidor web escuchando en el puerto ${webServerPort}`));