const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');

    if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath, { recursive: true });
    return;
   }

   const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath); 
    if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
    } else {
         client.on(event.name, (...args) => event.execute(...args));
    }
        
    console.log(`Event yüklendi: ${event.name}`);
    }
}