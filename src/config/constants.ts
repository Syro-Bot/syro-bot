/**
 * Application Constants
 * 
 * This file contains all the constant values used throughout the application.
 * In a production environment, these should be loaded from environment variables.
 */

// Bot Owner ID - This should match the OWNER_ID in your .env file
export const BOT_OWNER_ID = '590275518599921701';

// API Endpoints
export const API_BASE_URL = 'http://localhost:3001';
export const AUTH_BASE_URL = 'http://localhost:3002';

// Discord API
export const DISCORD_API_BASE = 'https://discord.com/api';

// Bot Configuration
export const BOT_CLIENT_ID = '1391677410046644274';
export const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

// Feature Flags
export const FEATURES = {
  GLOBAL_ANNOUNCEMENTS: true,
  TEMPLATES: true,
  AUTOMOD: true,
  WELCOME_MESSAGES: true,
  JOIN_ROLES: true,
  REACTION_ROLES: true,
  SOCIAL_NOTIFICATIONS: true,
  CHANNEL_CREATION: true,
} as const;

// UI Constants
export const UI = {
  MAX_EMBEDS: 3,
  MAX_CHANNELS_PER_ANNOUNCEMENT: 10,
  MAX_SERVERS_PER_GLOBAL_ANNOUNCEMENT: 50,
  ANIMATION_DURATION: 500,
  DEBOUNCE_DELAY: 300,
} as const; 