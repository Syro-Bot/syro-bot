/**
 * PM2 Ecosystem Configuration for Syro Bot Backend
 * 
 * This file configures all the services that run the Syro Discord bot backend:
 * - syro-server: Main Express API server for the web dashboard
 * - syro-bot: Discord bot for automoderation and server management
 * - syro-auth: Authentication server for Discord OAuth2
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

module.exports = {
  apps: [
    /**
     * Main Express API Server
     * Handles all HTTP requests from the frontend dashboard
     * Provides endpoints for template management, automod rules, etc.
     */
    {
      name: 'syro-server',
      cwd: './',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      log_file: './logs/server.log',
      out_file: './logs/server-out.log',
      error_file: './logs/server-error.log',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G'
    },
    
    /**
     * Discord Bot Service
     * Handles all Discord events and automoderation features
     * Manages spam detection, raid protection, welcome messages, etc.
     */
    {
      name: 'syro-bot',
      cwd: './',
      script: 'index.js',
      env: {
        NODE_ENV: 'development'
      },
      log_file: './logs/bot.log',
      out_file: './logs/bot-out.log',
      error_file: './logs/bot-error.log',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G'
    },
    
    /**
     * Authentication Server
     * Handles Discord OAuth2 authentication for the web dashboard
     * Manages user sessions and Discord API token exchange
     */
    {
      name: 'syro-auth',
      cwd: './',
      script: 'auth-server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      log_file: './logs/auth.log',
      out_file: './logs/auth-out.log',
      error_file: './logs/auth-error.log',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M'
    }
  ]
}; 