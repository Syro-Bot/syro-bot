/**
 * @fileoverview Announcement Configuration Model
 *
 * Modelo para almacenar la configuración de canales de announcement por servidor.
 * Cada servidor puede configurar un canal específico para recibir announcements globales.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const mongoose = require('mongoose');

const announcementConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  channelId: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true
  },
  configuredBy: {
    type: String,
    required: true
  },
  configuredAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
announcementConfigSchema.index({ guildId: 1 });
announcementConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model('AnnouncementConfig', announcementConfigSchema); 