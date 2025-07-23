const { Events, REST, Routes } = require('discord.js');
const { on, once } = require('..');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} olarak giriş yapıldı`);

        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST().setToken(process.env.TOKEN);

        try {
            console.log('Komutlar yükleniyor...');

            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );

            console.log('Komutlar başarıyla yüklendi!');
        } catch (error) {
            console.error('Komutlar yüklenirken bir hata oluştu:', error);
        }

        client.user.setPresence({
            activities: [{ name: 'Developed by erslly', type: 3 }],
            status: 'online'
        });
    },
};