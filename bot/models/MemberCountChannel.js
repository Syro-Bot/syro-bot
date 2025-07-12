/**
 * @fileoverview Member Count Channel Model
 *
 * Modelo para almacenar la configuración de canales de conteo de miembros.
 * Cada servidor puede tener múltiples canales de conteo de miembros.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const mongoose = require('mongoose');

const memberCountChannelSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  channelName: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: false
  },
  categoryName: {
    type: String,
    required: false
  },
  displayName: {
    type: String,
    required: true,
    default: 'ᴀʟʟ ᴍᴇᴍʙᴇʀs'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
memberCountChannelSchema.index({ guildId: 1 });
memberCountChannelSchema.index({ channelId: 1 });
memberCountChannelSchema.index({ isActive: 1 });

module.exports = mongoose.model('MemberCountChannel', memberCountChannelSchema); 