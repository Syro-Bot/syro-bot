/**
 * AutoModeration Service
 * Handles spam detection and raid prevention
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const cacheManager = require('./cacheManager');
const { getCustomEmoji } = require('../utils/permissionValidator');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle spam detection for messages
 * @param {Message} message - Discord message object
 * @param {Object} config - Server configuration
 */
async function handleSpamDetection(message, config) {
  if (!config || !config.automodRules?.Spam || config.automodRules.Spam.length === 0) {
    console.log(`ℹ️ No spam rules configured for ${message.guild.name}`);
    return;
  }

  const rule = config.automodRules.Spam[0];
  const key = `${message.guild.id}-${message.author.id}`;
  const cooldownKey = `cooldown-${message.guild.id}-${message.author.id}`;
  
  console.log(`🔍 Checking spam for ${message.author.tag} - Rule: ${rule.messageCount} messages in ${rule.timeWindow}s`);
  
  // Verificar si el usuario está en cooldown
  if (cacheManager.recentMessages.has(cooldownKey)) {
    console.log(`⏰ Usuario ${message.author.tag} en cooldown, eliminando mensaje`);
    await message.delete().catch(err => console.log('No se pudo eliminar mensaje en cooldown:', err.message));
    return;
  }
  
  if (!cacheManager.recentMessages.has(key)) {
    cacheManager.recentMessages.set(key, []);
  }
  
  const userMessages = cacheManager.recentMessages.get(key);
  userMessages.push({ timestamp: Date.now() });
  
  console.log(`📝 Added message for ${message.author.tag}. Total messages: ${userMessages.length}`);
  
  // Limpiar mensajes antiguos ANTES de verificar el límite
  const now = Date.now();
  const timeWindowMs = rule.timeWindow * 1000;
  
  // Filtrar mensajes dentro del timeWindow
  const recentMessages = userMessages.filter(msg => (now - msg.timestamp) < timeWindowMs);
  
  // Actualizar el cache con solo los mensajes recientes
  cacheManager.recentMessages.set(key, recentMessages);
  
  console.log(`🧹 Cleaned cache for ${message.author.tag}. Recent messages: ${recentMessages.length}/${rule.messageCount} threshold`);
  
  // Verificar si excede el límite DESPUÉS de la limpieza
  if (recentMessages.length >= rule.messageCount) {
    console.log(`🚨 SPAM DETECTADO: ${message.author.tag} envió ${recentMessages.length} mensajes en ${rule.timeWindow}s`);
    
    let totalDeleted = 0;
    
    try {
      // Eliminar el mensaje actual primero
      await message.delete().catch(err => console.log('No se pudo eliminar mensaje actual:', err.message));
      totalDeleted++;
      
      // Buscar más mensajes del usuario de forma más agresiva
      // Buscar mensajes en múltiples lotes para asegurar que encontramos todos
      let allMessages = [];
      let lastMessageId = null;
      
      // Hacer múltiples fetch para obtener más mensajes
      for (let i = 0; i < 3; i++) {
        const fetchOptions = lastMessageId 
          ? { limit: 100, before: lastMessageId }
          : { limit: 100 };
          
        const messagesBatch = await message.channel.messages.fetch(fetchOptions);
        allMessages = allMessages.concat(Array.from(messagesBatch.values()));
        
        if (messagesBatch.size < 100) break; // No hay más mensajes
        
        lastMessageId = messagesBatch.last().id;
      }
      
      console.log(`🔍 Total de mensajes obtenidos del canal: ${allMessages.length}`);
      
      // Filtrar mensajes del usuario - ser más permisivo con el tiempo
      const userRecentMessages = allMessages.filter(msg => {
        const isFromUser = msg.author.id === message.author.id;
        const age = Math.round((now - msg.createdTimestamp) / 1000);
        
        // Ser más permisivo: considerar recientes mensajes de hasta 60 segundos
        const isRecent = age <= 60;
        const isNotTooOld = (now - msg.createdTimestamp) < (14 * 24 * 60 * 60 * 1000); // Máximo 14 días
        
        if (isFromUser) {
          console.log(`🔍 Mensaje del usuario encontrado: ${msg.id} (hace ${age}s) - Reciente: ${isRecent}, No muy viejo: ${isNotTooOld}`);
        }
        
        return isFromUser && isRecent && isNotTooOld;
      });
      
      console.log(`🔍 Buscando mensajes de ${message.author.tag} en los últimos 60 segundos`);
      console.log(`🗑️ Encontrados ${userRecentMessages.length} mensajes de spam para eliminar`);
      
      // Log detallado de los mensajes encontrados
      userRecentMessages.forEach((msg, index) => {
        const age = Math.round((now - msg.createdTimestamp) / 1000);
        console.log(`  ${index + 1}. Mensaje ${msg.id}: "${msg.content.substring(0, 50)}..." (hace ${age}s)`);
      });
      
      if (userRecentMessages.length > 0) {
        console.log(`🗑️ Intentando eliminar ${userRecentMessages.length} mensajes...`);
        
        // Verificar permisos del bot
        const botPermissions = message.channel.permissionsFor(message.guild.members.me);
        console.log(`🔧 Permisos del bot en el canal:`, botPermissions.toArray());
        
        if (!botPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
          console.error('❌ El bot no tiene permisos para eliminar mensajes en este canal');
          return;
        }
        
        // Ordenar mensajes por timestamp (más recientes primero)
        userRecentMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        
        // Eliminar en lotes de 10 para evitar límites de Discord
        const batches = [];
        for (let i = 0; i < userRecentMessages.length; i += 10) {
          batches.push(userRecentMessages.slice(i, i + 10));
        }
        
        console.log(`📦 Dividido en ${batches.length} lotes para eliminación`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} con ${batch.length} mensajes`);
          
          try {
            console.log(`🔄 Intentando bulkDelete para lote ${batchIndex + 1} con ${batch.length} mensajes`);
            console.log(`📋 IDs de mensajes en el lote:`, batch.map(msg => msg.id));
            
            await message.channel.bulkDelete(batch, true);
            totalDeleted += batch.length;
            console.log(`✅ Lote ${batchIndex + 1} eliminado exitosamente`);
          } catch (bulkError) {
            console.error(`❌ Error en bulkDelete para lote ${batchIndex + 1}:`, bulkError);
            
            // Fallback: eliminar mensajes individualmente
            console.log(`🔄 Intentando eliminación individual para lote ${batchIndex + 1}`);
            for (const msg of batch) {
              try {
                await msg.delete();
                totalDeleted++;
                console.log(`✅ Mensaje individual eliminado: ${msg.id}`);
              } catch (individualError) {
                console.error(`❌ Error eliminando mensaje individual ${msg.id}:`, individualError);
              }
            }
          }
        }
        
        console.log(`📊 Total de mensajes eliminados: ${totalDeleted}`);
        
        // Aplicar cooldown al usuario
        cacheManager.recentMessages.set(cooldownKey, [{ timestamp: Date.now() }]);
        
        // Limpiar el cache de mensajes del usuario
        cacheManager.recentMessages.delete(key);
        
        // Enviar advertencia con el total de mensajes eliminados
        const trashEmoji = getCustomEmoji(message.guild, 'trash', '🗑️');
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear().toString().slice(-2)}`;
        
        const spamEmbed = new EmbedBuilder()
          .setTitle('⚠️ SPAM DETECTADO')
          .setDescription(`${message.author}, has enviado demasiados mensajes rápidamente.\n\n${trashEmoji} **Mensajes eliminados:** ${totalDeleted} mensajes\n\n*hoy a las ${currentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${formattedDate}*`)
          .setColor(0xFFA500);
        
        await message.channel.send({ embeds: [spamEmbed] });
      }
    } catch (error) {
      handleError(error, 'spam detection');
    }
  }
}

/**
 * Handle join raid detection
 * @param {GuildMember} member - Discord guild member
 * @param {Object} config - Server configuration
 */
async function handleJoinRaidDetection(member, config) {
  if (!config || !config.automodRules?.Raids) return;
  
  const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'join');
  if (raidRules.length === 0) return;
  
  const rule = raidRules[0];
  const key = member.guild.id;
  
  if (!cacheManager.recentJoins.has(key)) {
    cacheManager.recentJoins.set(key, []);
  }
  
  const guildJoins = cacheManager.recentJoins.get(key);
  guildJoins.push({ timestamp: Date.now() });
  
  // Clean up old joins
  cacheManager.cleanupCache(cacheManager.recentJoins, rule.timeWindow, 'recentJoins');
  
  // Check if limit is exceeded
  if (guildJoins.length >= rule.joinCount) {
    // Log raid detection
    await LogManager.logRaidDetected(member.guild.id, 'join', {
      count: guildJoins.length,
      threshold: rule.joinCount,
      timeWindow: rule.timeWindow,
      lockdownDuration: rule.lockdownDuration
    });
    
    // Apply lockdown using debouncing
    cacheManager.debouncedRaidDetection(member.guild.id, 'join', () => {
      const lockdownService = require('./lockdownService');
      lockdownService.applyLockdown(member.guild, rule.lockdownDuration, 'join');
    });
    
    // Clear cache for this guild
    cacheManager.recentJoins.delete(key);
  }
}

module.exports = {
  handleSpamDetection,
  handleJoinRaidDetection
}; 