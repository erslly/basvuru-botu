const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Database } = require('metusbase');
const db = new Database('db.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`${interaction.commandName} komutu bulunamadı`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Komut çalıştırılırken hata:', error);
                
                const errorMessage = { 
                    content: 'komut calıstırılırken bi hata olustu', 
                    ephemeral: true 
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        else if (interaction.isButton()) {
            const guildSettings = db.get('guilds.'+interaction.guildId);
            
            if (!guildSettings) {
                return interaction.reply({ 
                    content: 'bu sunucu için başvuru sistemi kurulmamış', 
                    ephemeral: true 
                });
            }

            if (interaction.customId === 'start_application') {
                const userId = interaction.user.id;
                const now = Date.now();
                let lastApplicationTime = null;
                let lastApplicationId = null;
                const applications = db.getAll('applications');
                for (const [id, app] of Object.entries(applications)) {
                    if (app.guildId === interaction.guildId && app.userId === userId) {
                        if (!lastApplicationTime || new Date(app.timestamp).getTime() > lastApplicationTime) {
                            lastApplicationTime = new Date(app.timestamp).getTime();
                            lastApplicationId = id;
                        }
                    }
                }
                if (lastApplicationTime && (now - lastApplicationTime) < 6 * 60 * 60 * 1000) {
                    const kalanMs = 6 * 60 * 60 * 1000 - (now - lastApplicationTime);
                    const kalanUnix = Math.floor((lastApplicationTime + 6 * 60 * 60 * 1000) / 1000);
                    const kalanSaat = Math.floor(kalanMs / (60 * 60 * 1000));
                    const kalanDakika = Math.floor((kalanMs % (60 * 60 * 1000)) / (60 * 1000));
                    const kalanSaniye = Math.floor((kalanMs % (60 * 1000)) / 1000);
                    const bekleEmbed = new EmbedBuilder()
                        .setColor(0xFF9900)
                        .setTitle('⏳ Tekrar Başvuru İçin Beklemelisin')
                        .setDescription(`Daha önce başvuru yaptın. Yeni başvuru gönderebilmek için lütfen bekle:\n\n**${kalanSaat} saat ${kalanDakika} dakika ${kalanSaniye} saniye**\n\nYeniden başvuru yapabileceğin zaman: <t:${kalanUnix}:R>`)
                        .setTimestamp();
                    return interaction.reply({ embeds: [bekleEmbed], ephemeral: true });
                }
                const modal = new ModalBuilder()
                    .setCustomId('application_modal')
                    .setTitle('📝 Başvuru Formu');

                const nameInput = new TextInputBuilder()
                    .setCustomId('name_input')
                    .setLabel('Adınız Soyadınız')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(50);

                const ageInput = new TextInputBuilder()
                    .setCustomId('age_input')
                    .setLabel('Yaşınız')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(3);

                const experienceInput = new TextInputBuilder()
                    .setCustomId('experience_input')
                    .setLabel('Deneyiminiz')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(500)
                    .setPlaceholder('Bu konudaki deneyiminizi detaylı bir şekilde anlatın...');

                const whyInput = new TextInputBuilder()
                    .setCustomId('why_input')
                    .setLabel('Neden bu pozisyonu istiyorsunuz?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(500);

                const additionalInput = new TextInputBuilder()
                    .setCustomId('additional_input')
                    .setLabel('Ek Bilgiler (İsteğe bağlı)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(300);

                const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
                const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(experienceInput);
                const fourthActionRow = new ActionRowBuilder().addComponents(whyInput);
                const fifthActionRow = new ActionRowBuilder().addComponents(additionalInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

                await interaction.showModal(modal);
            }

            else if (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('reject_')) {
                if (!interaction.member.permissions.has('ManageGuild')) {
                    return interaction.reply({ 
                        content: 'yetkin yok', 
                        ephemeral: true 
                    });
                }

                const [action, ...idParts] = interaction.customId.split('_');
                const applicationId = idParts.join('_');
                const application = db.get('applications.'+applicationId);
                
                if (!application) {
                    console.error(`Başvuru bulunamadı! ID: ${applicationId}, db.applications:`, db.getAll('applications'));
                    return interaction.reply({ 
                        content: 'Başvuru bulunamadı', 
                        ephemeral: true 
                    });
                }

                const applicant = await interaction.guild.members.fetch(application.userId).catch(() => null);
                
                if (action === 'approve') {
                    const approvedEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Başvuru Onaylandı')
                        .setDescription(`**${application.name}** adlı kullanıcının başvurusu **${interaction.user.tag}** tarafından onaylandı.`)
                        .setTimestamp();

                    await interaction.update({ embeds: [approvedEmbed], components: [] });

                    if (applicant) {
                        try {
                            await applicant.send({
                                embeds: [new EmbedBuilder()
                                    .setColor(0x00FF00)
                                    .setTitle('🎉 Başvurunuz Onaylandı!')
                                    .setDescription(`**${interaction.guild.name}** sunucusundaki başvurunuz onaylandı!`)
                                    .setTimestamp()]
                            });
                        } catch (error) {
                            console.log('dm gönderilemedi:', error.message);
                            await interaction.followUp({
                                content: `${application.name} kullanıcısına dm gönderilemedi.`,
                                ephemeral: true
                            });
                        }
                    } else {
                        await interaction.followUp({
                            content: `Kullanıcı sunucudan ayrılmış veya bulunamıyor.`,
                            ephemeral: true
                        });
                    }
                } else {
                    const rejectedEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Başvuru Reddedildi')
                        .setDescription(`**${application.name}** adlı kullanıcının başvurusu **${interaction.user.tag}** tarafından reddedildi.`)
                        .setTimestamp();

                    await interaction.update({ embeds: [rejectedEmbed], components: [] });

                    if (applicant) {
                        try {
                            await applicant.send({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('❌ Başvurunuz Reddedildi')
                                    .setDescription(`**${interaction.guild.name}** sunucusundaki başvurunuz reddedildi.`)
                                    .setTimestamp()]
                            });
                        } catch (error) {
                            console.log('dm gönderilemedi:', error.message);
                            await interaction.followUp({
                                content: `${application.name} kullanıcısına dm gönderilemedi.`,
                                ephemeral: true
                            });
                        }
                    } else {
                        await interaction.followUp({
                            content: `Kullanıcı sunucudan ayrılmış veya bulunamıyor.`,
                            ephemeral: true
                        });
                    }
                }

                db.delete('applications.'+applicationId);
            }
        }

        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'application_modal') {
                const guildSettings = db.get('guilds.'+interaction.guildId);
                
                if (!guildSettings) {
                    return interaction.reply({ 
                        content: 'basvuru sistemi kurulmamış', 
                        ephemeral: true 
                    });
                }

                const name = interaction.fields.getTextInputValue('name_input');
                const age = interaction.fields.getTextInputValue('age_input');
                const experience = interaction.fields.getTextInputValue('experience_input');
                const why = interaction.fields.getTextInputValue('why_input');
                const additional = interaction.fields.getTextInputValue('additional_input') || 'Belirtilmemiş';
                const applicationId = `${interaction.guildId}_${interaction.user.id}_${Date.now()}`;

                db.set('applications.'+applicationId, {
                    id: applicationId,
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    username: interaction.user.tag,
                    name: name,
                    age: age,
                    experience: experience,
                    why: why,
                    additional: additional,
                    timestamp: new Date().toISOString()
                });

                const applicationEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('Yeni Başvuru')
                    .setDescription(`**${interaction.user.tag}** adlı kullanıcı başvuru yaptı.`)
                    .addFields(
                        { name: 'Ad Soyad', value: name, inline: true },
                        { name: 'Yaş', value: age, inline: true },
                        { name: 'Başvuru Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: 'Deneyim', value: experience },
                        { name: 'Neden bu pozisyon?', value: why },
                        { name: 'Ek Bilgiler', value: additional }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: `Başvuru ID: ${applicationId}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve_${applicationId}`)
                            .setLabel('Onayla')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId(`reject_${applicationId}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );

                const managementChannel = interaction.guild.channels.cache.get(guildSettings.managementChannelId);
                if (managementChannel) {
                    await managementChannel.send({
                        embeds: [applicationEmbed],
                        components: [buttons]
                    });
                }

                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Başvuru Gönderildi!')
                        .setDescription('Başvurunuz başarıyla gönderildi. Yöneticiler en kısa sürede değerlendirecektir.')
                        .setTimestamp()],
                    ephemeral: true
                });
            }
        }
    },
};