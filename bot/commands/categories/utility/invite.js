/**
 * @fileoverview Invite Command - Send bot invite link
 * 
 * Utility command to send the bot's invite link with an embed and gif.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const path = require('path');

class InviteCommand extends TextCommand {
  constructor() {
    super({
      name: 'invite',
      description: 'Get the bot invite link',
      category: 'utility',
      permissions: [],
      cooldown: 5000,
      aliases: ['inv', 'botinvite'],
      usage: 'invite',
      examples: ['invite'],
      args: {},
      guildOnly: false,
      botPermissions: [],
      deleteAfter: false,
      embed: {
        color: '#00bfff'
      }
    });
  }

  async run(message) {
    const inviteUrl = process.env.BOT_INVITE_URL || 'https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=8';
    const embed = this.createEmbed({
      title: 'Invite Syro Bot',
      description: `Click the link below to invite the bot to your server!\n\n[Invite Link](${inviteUrl})`,
      color: '#00bfff',
      image: {
        url: 'attachment://mcsnow.gif'
      }
    });
    await message.reply({
      embeds: [embed],
      files: [path.join(path.resolve(__dirname, '../../../..'), 'public', 'mcsnow.gif')]
    });
    return true;
  }
}

module.exports = InviteCommand; 