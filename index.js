const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,  
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
const dbPath = path.join(__dirname, 'database', 'db.json');
if (!fs.existsSync(dbPath)) {
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify({
        guilds: {},
        applications: {}
    }, null, 2));
}

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

client.login(process.env.TOKEN)

module.exports = client;