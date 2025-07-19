/**
 * @fileoverview Ping Command - Check bot latency
 * 
 * Utility command to check bot latency and connection status.
 * Provides detailed information about API and WebSocket latency.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');

/**
 * Ping Command Class
 * 
 * Checks bot latency and connection status.
 * 
 * @class PingCommand
 * @extends TextCommand
 */
class PingCommand extends TextCommand {
  constructor() {
    super({
      name: 'ping',
      description: 'Check bot latency and connection status',
      category: 'utility',
      permissions: [],
      cooldown: 5000, // 5 seconds
      aliases: ['latency', 'pong'],
      usage: 'ping',
      examples: [
        'ping'
      ],
      args: {},
      guildOnly: false,
      botPermissions: [],
      deleteAfter: false,
      embed: {
        color: '#00ff00'
      }
    });
  }

  /**
   * Execute the ping command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    try {
      const startTime = Date.now();
      
      // Send initial message to measure round-trip time
      const pingMessage = await this.sendInfo(
        message,
        'Pinging...',
        'Calculating bot latency...'
      );
      
      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      
      // Get bot latency information
      const wsLatency = message.client.ws.ping;
      const apiLatency = roundTripTime;
      
      // Determine latency status
      const getLatencyStatus = (latency) => {
        if (latency < 100) return { status: 'Excellent', color: '#00ff00', emoji: '🟢' };
        if (latency < 200) return { status: 'Good', color: '#ffff00', emoji: '🟡' };
        if (latency < 400) return { status: 'Fair', color: '#ff8800', emoji: '🟠' };
        return { status: 'Poor', color: '#ff0000', emoji: '🔴' };
      };
      
      const wsStatus = getLatencyStatus(wsLatency);
      const apiStatus = getLatencyStatus(apiLatency);
      
      // Create detailed ping embed
      const pingEmbed = this.createEmbed({
        title: '🏓 Pong!',
        description: 'Here are the current latency statistics:',
        color: '#00ff00',
        fields: [
          {
            name: `${wsStatus.emoji} WebSocket Latency`,
            value: `**${wsLatency}ms** - ${wsStatus.status}`,
            inline: true
          },
          {
            name: `${apiStatus.emoji} API Latency`,
            value: `**${apiLatency}ms** - ${apiStatus.status}`,
            inline: true
          },
          {
            name: '📊 Overall Status',
            value: this._getOverallStatus(wsLatency, apiLatency),
            inline: true
          },
          {
            name: '🔗 Connection',
            value: this._getConnectionInfo(message.client),
            inline: false
          }
        ],
        footer: { text: 'Latency checked' },
        thumbnail: message.client.user.displayAvatarURL()
      });
      
      // Update the message with ping results
      await pingMessage.edit({ embeds: [pingEmbed] });
      
      return true;
      
    } catch (error) {
      logger.error(`❌ Error in ping command:`, error);
      
      await this.sendError(
        message, 
        'Ping Failed', 
        'An error occurred while checking latency. Please try again.'
      );
      
      return false;
    }
  }

  /**
   * Get overall connection status
   * 
   * @param {number} wsLatency - WebSocket latency
   * @param {number} apiLatency - API latency
   * @returns {string} Overall status description
   * @private
   */
  _getOverallStatus(wsLatency, apiLatency) {
    const avgLatency = Math.round((wsLatency + apiLatency) / 2);
    
    if (avgLatency < 100) {
      return '🟢 **Excellent** - Bot is running smoothly';
    } else if (avgLatency < 200) {
      return '🟡 **Good** - Bot is performing well';
    } else if (avgLatency < 400) {
      return '🟠 **Fair** - Bot may experience delays';
    } else {
      return '🔴 **Poor** - Bot may be experiencing issues';
    }
  }

  /**
   * Get connection information
   * 
   * @param {Client} client - Discord client
   * @returns {string} Connection information
   * @private
   */
  _getConnectionInfo(client) {
    const uptime = this.formatDuration(client.uptime);
    const guilds = client.guilds.cache.size;
    const users = client.users.cache.size;
    const channels = client.channels.cache.size;
    
    return `**Uptime:** ${uptime}\n**Guilds:** ${guilds}\n**Users:** ${users}\n**Channels:** ${channels}`;
  }
}

module.exports = PingCommand; 