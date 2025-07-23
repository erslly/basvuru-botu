const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'db.json');

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (error) {
        return { guilds: {}, applications: {} };
    }
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('basvuru-kurulum')
        .setDescription('Başvuru sistemini kurar ve yapılandırır')
        .addChannelOption(option =>
            option.setName('basvuru-kanali')
                .setDescription('Başvuru formunun gösterileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
            option.setName('yonetim-kanali')
                .setDescription('Başvuruların değerlendirileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('pozisyon')
                .setDescription('Başvuru pozisyonu (örn: Moderatör, Yönetici)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('aciklama')
                .setDescription('Başvuru hakkında açıklama')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const applicationChannel = interaction.options.getChannel('basvuru-kanali');
        const managementChannel = interaction.options.getChannel('yonetim-kanali');
        const position = interaction.options.getString('pozisyon');
        const description = interaction.options.getString('aciklama') || 'Bu pozisyon için başvuru yapabilirsiniz.';

        if (applicationChannel.type !== ChannelType.GuildText || managementChannel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: 'sadece metin kanalinda kurulum yapabilirsin.',
                ephemeral: true
            });
        }

        const botMember = interaction.guild.members.me;
        const requiredPermissions = ['SendMessages', 'EmbedLinks', 'UseExternalEmojis'];
        
        for (const permission of requiredPermissions) {
            if (!applicationChannel.permissionsFor(botMember).has(permission)) {
                return interaction.reply({
                    content: `Botun ${applicationChannel} kanalında \`${permission}\` iznine ihtiyacı var`,
                    ephemeral: true
                });
            }
            if (!managementChannel.permissionsFor(botMember).has(permission)) {
                return interaction.reply({
                    content: `Botun ${managementChannel} kanalında \`${permission}\` iznine ihtiyacı var`,
                    ephemeral: true
                });
            }
        }

        const db = readDB();
        db.guilds[interaction.guildId] = {
            applicationChannelId: applicationChannel.id,
            managementChannelId: managementChannel.id,
            position: position,
            description: description,
            setupBy: interaction.user.id,
            setupAt: new Date().toISOString()
        };
        writeDB(db);

        const applicationEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${position} Başvuru Formu`)
            .setDescription(`Aşağıdaki butona tıklayarak **${position}** pozisyonu için başvuru yapabilirsin.\n\n${description}`)
            .addFields(
                { name: 'Başvuru Adımları', value: '1. Butona tıkla\n2. Formu doldur\n3. Değerlendirme sürecini bekle', inline: false },
                { name: 'Değerlendirme', value: 'Başvurun en kısa sürede incelenecek.', inline: false },
                { name: 'İletişim', value: 'Herhangi bir sorunda yönetim ekibiyle iletişime geçebilirsin.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: `Developed by erslly` })
            .setTimestamp();

        const applicationButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('Başvuru Yap')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );

        try {
            await applicationChannel.send({
                embeds: [applicationEmbed],
                components: [applicationButton]
            });

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Başvuru Sistemi Kuruldu!')
                .setDescription('Başvuru sistemi başarıyla kuruldu ve yapılandırıldı.')
                .addFields(
                    { name: 'Başvuru Kanalı', value: `${applicationChannel}`, inline: true },
                    { name: 'Yönetim Kanalı', value: `${managementChannel}`, inline: true },
                    { name: 'Pozisyon', value: position, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const managementEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Başvuru Sistemi Aktif')
                .setDescription(`**${position}** pozisyonu için başvuru sistemi aktif edildi.`)
                .addFields(
                    { name: 'Başvuru Kanalı', value: `${applicationChannel}`, inline: true },
                    { name: 'Kuran Kişi', value: `${interaction.user}`, inline: true },
                    { name: 'Kurulum Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                //.setFooter({ text: 'Yeni başvurular bu kanala gelecektir.' }) bunuda kullanabilirsiniz
                .setFooter({ text: 'Developed by erslly' })
                .setTimestamp();

            await managementChannel.send({ embeds: [managementEmbed] });

        } catch (error) {
            console.error('Kurulum hatası:', error);
            await interaction.reply({
                content: 'Botun izni yok ac',
                ephemeral: true
            });
        }
    },
};