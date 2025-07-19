/**
 * Discord Bot - Main Entry Point
 * Refactored and optimized version with modular architecture
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// Import services
const cacheManager = require('./services/cacheManager');
const { setupMemberCountListeners, updateAllMemberCountChannels } = require('./utils/memberCountUpdater');

// Import handlers (will be created next)
const messageHandler = require('./handlers/messageHandler');
const memberHandler = require('./handlers/memberHandler');
const channelHandler = require('./handlers/channelHandler');
const roleHandler = require('./handlers/roleHandler');

// Import command system
const commandsSystem = require('./commands');

/**
 * Discord Client Configuration
 * Sets up the bot with necessary intents to monitor server activity
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Access to guild information
    GatewayIntentBits.GuildMessages,    // Access to message content
    GatewayIntentBits.GuildMembers,     // Access to member information
    GatewayIntentBits.MessageContent,   // Access to message content for spam detection
    GatewayIntentBits.GuildModeration,  // Access to moderation features
    GatewayIntentBits.GuildPresences,   // Access to presence updates
    GatewayIntentBits.GuildIntegrations, // Access to integrations
    GatewayIntentBits.GuildWebhooks,    // Access to webhooks
    GatewayIntentBits.GuildInvites,     // Access to invites
    GatewayIntentBits.GuildVoiceStates, // Access to voice states
    GatewayIntentBits.GuildMessageReactions, // Access to message reactions
    GatewayIntentBits.GuildMessageTyping, // Access to typing indicators
    GatewayIntentBits.DirectMessages,   // Access to DM messages
    GatewayIntentBits.DirectMessageReactions, // Access to DM reactions
    GatewayIntentBits.DirectMessageTyping, // Access to DM typing indicators
  ],
});

/**
 * Bot Ready Event
 * Fired when the bot successfully connects to Discord
 */
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`📊 Bot is in ${client.guilds.cache.size} guilds`);
  
  // List all guilds
  client.guilds.cache.forEach(guild => {
    console.log(`🏠 Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
  });
  
  // Setup all cache and cleanup systems
  console.log('🧹 Setting up cache cleanup...');
  cacheManager.setupCacheCleanup();
  cacheManager.setupConfigCacheCleanup();
  
  // Setup member count listeners
  console.log('👥 Setting up member count listeners...');
  setupMemberCountListeners(client);
  
  // Update all member count channels on startup
  console.log('📊 Updating member count channels...');
  updateAllMemberCountChannels(client);
  
  // Initialize new command system
  console.log('🚀 Initializing command system...');
  await commandsSystem.initialize(client);
  
  // Register legacy commands with new command system
  console.log('🔄 Registering legacy commands...');
  await messageHandler.registerLegacyCommands();
  
  // Log command system statistics
  const commandStats = commandsSystem.getStats();
  console.log('📈 Command System Statistics:', {
    categories: commandStats.categories,
    totalCommands: commandStats.totalCommands,
    categoryStats: Object.keys(commandStats.categoryStats)
  });
  
  console.log('✅ All systems initialized successfully');
  console.log('🎯 Bot is ready to handle events!');
});

/**
 * Event Handlers
 * Each handler manages its specific event type
 */

// Message events
client.on('messageCreate', (message) => {
  console.log(`📨 EVENT: messageCreate from ${message.author.tag} in ${message.guild.name}`);
  messageHandler.handleMessageCreate(message);
});

// Member events
client.on('guildMemberAdd', (member) => {
  console.log(`👋 EVENT: guildMemberAdd - ${member.user.tag} joined ${member.guild.name}`);
  memberHandler.handleMemberAdd(member);
});

client.on('guildMemberRemove', (member) => {
  console.log(`👋 EVENT: guildMemberRemove - ${member.user.tag} left ${member.guild.name}`);
  memberHandler.handleMemberRemove(member);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  console.log(`🔄 EVENT: guildMemberUpdate - ${newMember.user.tag} in ${newMember.guild.name}`);
  memberHandler.handleMemberUpdate(oldMember, newMember);
});

// Channel events
client.on('channelCreate', (channel) => {
  console.log(`📝 EVENT: channelCreate - ${channel.name} in ${channel.guild.name}`);
  channelHandler.handleChannelCreate(channel);
});

client.on('channelDelete', (channel) => {
  console.log(`🗑️ EVENT: channelDelete - ${channel.name} in ${channel.guild.name}`);
  channelHandler.handleChannelDelete(channel);
});

// Role events
client.on('roleCreate', (role) => {
  console.log(`🎭 EVENT: roleCreate - ${role.name} in ${role.guild.name}`);
  roleHandler.handleRoleCreate(role);
});

client.on('roleDelete', (role) => {
  console.log(`🗑️ EVENT: roleDelete - ${role.name} in ${role.guild.name}`);
  roleHandler.handleRoleDelete(role);
});

/**
 * Database Connection
 * Connects to MongoDB to store and retrieve server configurations
 */
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syro-bot')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

/**
 * Bot Authentication
 * Logs the bot into Discord using the token from environment variables
 */
client.login(process.env.DISCORD_TOKEN);

// Export client for use in other modules
module.exports = { client }; 