# Syro Discord Bot Backend

A comprehensive Discord bot backend system for server management, automoderation, and web dashboard integration.

## 🚀 Features

### 🤖 Discord Bot Features
- **Automoderation System**
  - Spam detection and prevention
  - Raid protection (join, channel, role raids)
  - Automatic channel cleanup during raids
  - Server lockdown management
  - Configurable thresholds per server

- **Administrative Commands**
  - `!unlock` - Manually unlock server from lockdown
  - `!cleanraid` - Clean up channels created during raids
  - `!raidstatus` - Check current raid and lockdown status

### 🌐 Web Dashboard API
- **Template Management**
  - Template submission and review system
  - File upload handling for template icons
  - Moderation workflow for template approval

- **Server Configuration**
  - Automoderation rules management
  - Server-specific settings
  - Real-time configuration updates

- **Analytics & Statistics**
  - Join statistics and analytics
  - Server activity tracking
  - Performance metrics

### 🔐 Authentication System
- **Discord OAuth2 Integration**
  - Secure user authentication
  - Session management
  - Guild access verification

## 📁 Project Structure

```
syro-web/bot/
├── index.js              # Main Discord bot (automoderation, raids)
├── server.js             # Express API server (dashboard backend)
├── auth-server.js        # OAuth2 authentication server
├── ecosystem.config.js   # PM2 process management configuration
├── package.json          # Dependencies and scripts
├── models/               # MongoDB schemas
│   ├── ServerConfig.js   # Server configuration and automod rules
│   ├── Template.js       # Template submission and review
│   └── Join.js          # Join event tracking
├── routes/               # API route handlers
│   └── automod.js       # Automoderation API endpoints
├── uploads/              # File upload storage
└── logs/                 # Application logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Made with ❤️ by the Syro Development Team** 