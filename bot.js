const mineflayer = require('mineflayer')

let bot = mineflayer.createBot({
  host: 'localhost',
  username: 'melsernglBOT',
  auth: 'offline',
  port: '25565',
});

bot.on('spawn', () => {
    bot.chat('/execute at @a run say hello');

})

function attackEntities() {
  const entity = bot.nearestEntity();

  if (!entity) {
    bot.setControlState('jump', false)
  } else {
    const distance = bot.entity.position.distanceTo(entity.position);

    if (distance <= 4) {
      bot.attack(entity);
      bot.look(0, 0);
      bot.setControlState('jump', true)
    } else {
      bot.setControlState('jump', false);
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true)
      setTimeout(() => {
        bot.setControlState('forward', false);
        bot.setControlState('sprint', true)
      }, 3000)
    }
  }
}

// Configura un bucle para atacar automáticamente
setInterval(() => {
  attackEntities(); // Puedes ajustar la frecuencia o condiciones según tus necesidades
}, 1000); // Ejecuta cada segundo
// Maneja los mensajes del chat
bot.on('chat', (username, message) => {
  // Verifica si el mensaje comienza con 'tp'
  if (message.startsWith('tp')) {
    // Procesa el comando y extrae el nombre del jugador
    const [, targetPlayer] = message.split(' ');

    // Ejecuta el comando /tp para teletransportar al jugador
    if (targetPlayer) {
      bot.chat(`/tp ${targetPlayer}`);
    } else {
      bot.chat('Uso incorrecto. Ejemplo: tp <nombre_del_jugador>');
    }
  }
});
// Reconnect to the server if disconnected
bot.on('end', () => {
  console.log('Disconnected from server. Reconnecting...');
  reconnect();
});

function reconnect() {
  bot = mineflayer.createBot({
    host: 'localhost',
    username: 'Bot',
    auth: 'offline',
    port: '25565',
  });
}

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)